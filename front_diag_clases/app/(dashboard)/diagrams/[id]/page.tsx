"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  BackgroundVariant,
  useReactFlow,
  OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { UmlClassNode } from "@/components/canvas/UmlClassNode";
import { UmlNoteNode } from "@/components/canvas/UmlNoteNode";
import { UmlEdge } from "@/components/canvas/UmlEdge";
import { UmlEdgeMarkers } from "@/components/canvas/UmlEdgeMarkers";
import { ClassEditModal } from "@/components/canvas/ClassEditModal";
import { RelationTypePickerModal } from "@/components/canvas/RelationTypePickerModal";
import { EdgeEditModal } from "@/components/canvas/EdgeEditModal";
import { CodePreviewModal } from "@/components/canvas/CodePreviewModal";
import { SpringBootExportModal } from "@/components/canvas/SpringBootExportModal";
import { FlutterExportModal } from "@/components/canvas/FlutterExportModal";
import { CollaboratorsHeader } from "@/components/canvas/CollaboratorsHeader";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { CanvasAiPromptBar } from "@/components/canvas/CanvasAiPromptBar";
import { CustomCanvasControls } from "@/components/canvas/CustomCanvasControls";
import { CollaborativeCursors, RemoteCursor } from "@/components/canvas/CollaborativeCursors";
import { api } from "@/services/api";
import { wsService } from "@/services/websocket";
import { processDiagramWithGemini } from "@/services/geminiDiagramService";
import {
  downloadEnterpriseArchitectXmi,
  generateEnterpriseArchitectXmi,
} from "@/services/xmiExporter";
import {
  DiagramResponse,
  UmlClassData,
  UmlEdgeData,
  UmlRelationType,
  User,
  WebSocketMessage,
} from "@/types";

function DiagramEditorContent() {
  const params = useParams();
  const router = useRouter();
  const diagramId = Number(params.id);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [diagram, setDiagram] = useState<DiagramResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Referencia para temporizador de autoguardado debounced
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cursores colaborativos remotos
  const [remoteCursors, setRemoteCursors] = useState<Record<number, RemoteCursor>>({});

  // Referencias para evitar stale closures
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const currentUserRef = useRef<User | null>(currentUser);
  const diagramRef = useRef<DiagramResponse | null>(diagram);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    diagramRef.current = diagram;
  }, [diagram]);

  // Hook de React Flow para convertir coordenadas de pantalla a coordenadas del lienzo
  const { screenToFlowPosition } = useReactFlow();

  // Modal de edición de clase
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeData, setEditingNodeData] = useState<UmlClassData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal selector de tipo de relación (al conectar)
  const [isRelationPickerOpen, setIsRelationPickerOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Modal de edición de arista / relación existente (al hacer clic en arista)
  const [isEdgeEditModalOpen, setIsEdgeEditModalOpen] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeData, setEditingEdgeData] = useState<UmlEdgeData | null>(null);
  const [edgeSourceClassName, setEdgeSourceClassName] = useState("Origen");
  const [edgeTargetClassName, setEdgeTargetClassName] = useState("Destino");

  // Modal de previsualización de código (XMI / JSON)
  const [isCodePreviewOpen, setIsCodePreviewOpen] = useState(false);

  // Modal de exportación de proyecto Spring Boot (MVC + PostgreSQL)
  const [isSpringBootExportOpen, setIsSpringBootExportOpen] = useState(false);

  // Modal de exportación de proyecto Flutter (Voz + IA Local)
  const [isFlutterExportOpen, setIsFlutterExportOpen] = useState(false);

  // Generación de códigos en vivo para previsualización
  const xmiCode = useMemo(
    () => generateEnterpriseArchitectXmi(diagram?.nombre || "diagrama", nodes, edges),
    [diagram?.nombre, nodes, edges]
  );

  const jsonCode = useMemo(
    () =>
      JSON.stringify(
        {
          diagramName: diagram?.nombre,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            data: e.data,
          })),
        },
        null,
        2
      ),
    [diagram?.nombre, nodes, edges]
  );

  // Evitar bucles infinitos de sincronización WebSocket
  const isReceivingRemoteUpdate = useRef(false);

  // Tipos de nodos y aristas registrados para React Flow
  const nodeTypes = useMemo(
    () => ({
      umlClass: UmlClassNode,
      umlNote: UmlNoteNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      umlEdge: UmlEdge,
      smoothstep: UmlEdge,
      default: UmlEdge,
    }),
    []
  );

  // Handler para abrir modal de edición de una clase
  const handleOpenEditClass = useCallback((nodeId: string, classData: UmlClassData) => {
    setEditingNodeId(nodeId);
    setEditingNodeData(classData);
    setIsEditModalOpen(true);
  }, []);

  // Limpieza periódica de cursores inactivos
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let hasExpired = false;
        const next: Record<number, RemoteCursor> = {};
        for (const [id, cursor] of Object.entries(prev)) {
          if (now - cursor.lastUpdated < 5000) {
            next[Number(id)] = cursor;
          } else {
            hasExpired = true;
          }
        }
        return hasExpired ? next : prev;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Cargar usuario inicial
  useEffect(() => {
    const raw = localStorage.getItem("diag_user");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const u: User = JSON.parse(raw);
      setCurrentUser(u);
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Cargar diagrama desde API
  useEffect(() => {
    if (!currentUser || !diagramId) return;

    const fetchDiagram = async () => {
      try {
        setIsLoading(true);
        const data = await api.getDiagramById(diagramId, currentUser.id);
        setDiagram(data);

        if (data.lienzo) {
          try {
            const parsed = JSON.parse(data.lienzo);
            const loadedNodes = (parsed.nodes || []).map((node: Node) => ({
              ...node,
              data: {
                ...node.data,
                onEdit: handleOpenEditClass,
              },
            }));

            const loadedEdges = (parsed.edges || []).map((edge: Edge) => ({
              ...edge,
              type: "umlEdge",
              data: {
                relationType: (edge.data as any)?.relationType || "ASSOCIATION",
                sourceMultiplicity: (edge.data as any)?.sourceMultiplicity || "",
                targetMultiplicity: (edge.data as any)?.targetMultiplicity || "",
                name: (edge.data as any)?.name || "",
              },
            }));

            setNodes(loadedNodes);
            setEdges(loadedEdges);
          } catch (e) {
            console.error("Error al parsear el lienzo del diagrama:", e);
          }
        }
      } catch (err) {
        console.error("Error al obtener el diagrama:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagram();
  }, [currentUser, diagramId, handleOpenEditClass]);

  // Conectar WebSockets para Colaboración en Tiempo Real
  useEffect(() => {
    if (!currentUser || !diagramId) return;

    wsService.connect(
      () => {
        setIsWsConnected(true);
        wsService.sendMessage(diagramId, {
          type: "JOIN",
          diagramId,
          userId: currentUser.id,
          userName: currentUser.nombre,
          userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
          payload: "",
        });

        wsService.subscribeToDiagram(diagramId, (msg: WebSocketMessage) => {
          const activeUser = currentUserRef.current;
          if (!activeUser) return;

          if (Number(msg.userId) === Number(activeUser.id)) return;

          if (msg.type === "CURSOR_MOVE" && msg.payload) {
            try {
              const { x, y } = JSON.parse(msg.payload);
              if (isNaN(x) || isNaN(y)) return;
              setRemoteCursors((prev) => ({
                ...prev,
                [msg.userId]: {
                  userId: Number(msg.userId),
                  userName: msg.userName || `Usuario ${msg.userId}`,
                  userRole: msg.userRole || "COLABORADOR",
                  x,
                  y,
                  lastUpdated: Date.now(),
                },
              }));
            } catch (e) {
              console.error("Error al procesar CURSOR_MOVE:", e);
            }
            return;
          }

          if (msg.type === "LEAVE") {
            setRemoteCursors((prev) => {
              const next = { ...prev };
              delete next[msg.userId];
              return next;
            });
            return;
          }

          if (msg.type === "NODE_MOVE" && msg.payload) {
            try {
              const { id, position } = JSON.parse(msg.payload);
              if (draggingNodeIdRef.current === id) return;

              isReceivingRemoteUpdate.current = true;
              setNodes((currentNodes) =>
                currentNodes.map((n) =>
                  n.id === id ? { ...n, position } : n
                )
              );
              setTimeout(() => {
                isReceivingRemoteUpdate.current = false;
              }, 40);
            } catch (e) {
              console.error("Error al procesar NODE_MOVE:", e);
            }
            return;
          }

          if (msg.type === "SYNC_CANVAS" && msg.payload) {
            try {
              isReceivingRemoteUpdate.current = true;
              const remote = JSON.parse(msg.payload);

              if (remote.nodes) {
                setNodes((currentNodes) => {
                  const remoteMap = new Map<string, any>(remote.nodes.map((n: any) => [n.id, n]));
                  const nextNodes = [...currentNodes];
                  let changed = false;

                  for (let i = 0; i < nextNodes.length; i++) {
                    const existing = nextNodes[i];
                    const remoteNode = remoteMap.get(existing.id);
                    if (remoteNode) {
                      const posChanged =
                        existing.position.x !== remoteNode.position.x ||
                        existing.position.y !== remoteNode.position.y;
                      const dataStr = JSON.stringify(existing.data);
                      const remoteDataStr = JSON.stringify(remoteNode.data);

                      if (posChanged || dataStr !== remoteDataStr) {
                        nextNodes[i] = {
                          ...existing,
                          position: remoteNode.position,
                          data: {
                            ...existing.data,
                            ...remoteNode.data,
                            onEdit: handleOpenEditClass,
                          },
                        };
                        changed = true;
                      }
                      remoteMap.delete(existing.id);
                    }
                  }

                  remoteMap.forEach((remoteNode) => {
                    nextNodes.push({
                      ...remoteNode,
                      data: {
                        ...remoteNode.data,
                        onEdit: handleOpenEditClass,
                      },
                    });
                    changed = true;
                  });

                  const finalNodes = nextNodes.filter((n) => {
                    const keep = remote.nodes.some((rn: Node) => rn.id === n.id);
                    if (!keep) changed = true;
                    return keep;
                  });

                  return changed ? finalNodes : currentNodes;
                });
              }

              if (remote.edges) {
                setEdges(
                  remote.edges.map((e: Edge) => ({
                    ...e,
                    type: "umlEdge",
                  }))
                );
              }

              setTimeout(() => {
                isReceivingRemoteUpdate.current = false;
              }, 60);
            } catch (e) {
              console.error("Error al aplicar actualización remota de lienzo:", e);
            }
          }
        });
      },
      () => {
        setIsWsConnected(false);
      }
    );

    return () => {
      // wsService.disconnect();
    };
  }, [currentUser, diagramId, diagram?.idCreador, handleOpenEditClass]);

  // Autoguardado debounced en la base de datos (REST PUT)
  const triggerAutoSave = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(async () => {
        const activeUser = currentUserRef.current;
        const activeDiagram = diagramRef.current;
        if (!activeUser || !activeDiagram || !diagramId) return;

        try {
          setIsSaving(true);
          const lienzoPayload = JSON.stringify({
            nodes: newNodes.map((n) => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: {
                name: (n.data as any)?.name,
                stereotype: (n.data as any)?.stereotype,
                attributes: (n.data as any)?.attributes,
                methods: (n.data as any)?.methods,
                content: (n.data as any)?.content,
              },
            })),
            edges: newEdges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              type: "umlEdge",
              data: e.data,
            })),
          });

          const updated = await api.updateDiagram(diagramId, {
            lienzo: lienzoPayload,
            usuarioId: activeUser.id,
          });

          setDiagram(updated);
          setLastSavedTime(new Date());
        } catch (err) {
          console.error("Error en autoguardado de diagrama:", err);
        } finally {
          setIsSaving(false);
        }
      }, 700);
    },
    [diagramId]
  );

  // Difundir cambios a colaboradores y autoguardar en base de datos
  const broadcastCanvas = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      // Disparar autoguardado en base de datos
      triggerAutoSave(newNodes, newEdges);

      if (!currentUser || isReceivingRemoteUpdate.current) return;

      const payload = JSON.stringify({
        nodes: newNodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            name: (n.data as any)?.name,
            stereotype: (n.data as any)?.stereotype,
            attributes: (n.data as any)?.attributes,
            methods: (n.data as any)?.methods,
            content: (n.data as any)?.content,
          },
        })),
        edges: newEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: "umlEdge",
          data: e.data,
        })),
      });

      wsService.sendMessage(diagramId, {
        type: "SYNC_CANVAS",
        diagramId,
        userId: currentUser.id,
        userName: currentUser.nombre,
        userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
        payload,
      });
    },
    [currentUser, diagramId, diagram?.idCreador, triggerAutoSave]
  );

  // Manejo de cambios de nodos
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      const hasRemoval = changes.some((c) => c.type === "remove");
      if (hasRemoval) {
        setTimeout(() => {
          broadcastCanvas(nodesRef.current, edgesRef.current);
        }, 0);
      }
    },
    [broadcastCanvas]
  );

  const draggingNodeIdRef = useRef<string | null>(null);

  const onNodeDragStart: OnNodeDrag = useCallback((_event, node) => {
    draggingNodeIdRef.current = node.id;
  }, []);

  const lastNodeDragBroadcastRef = useRef<number>(0);
  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      draggingNodeIdRef.current = node.id;
      if (!currentUser || isReceivingRemoteUpdate.current) return;
      const now = performance.now();
      if (now - lastNodeDragBroadcastRef.current > 35) {
        lastNodeDragBroadcastRef.current = now;

        wsService.sendMessage(diagramId, {
          type: "NODE_MOVE",
          diagramId,
          userId: currentUser.id,
          userName: currentUser.nombre,
          userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
          payload: JSON.stringify({
            id: node.id,
            position: node.position,
          }),
        });
      }
    },
    [currentUser, diagramId, diagram?.idCreador]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node) => {
      draggingNodeIdRef.current = null;
      setTimeout(() => {
        broadcastCanvas(nodesRef.current, edgesRef.current);
      }, 50);
    },
    [broadcastCanvas]
  );

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const lastCursorEmitRef = useRef<number>(0);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleGlobalPointerMove = (e: MouseEvent | PointerEvent) => {
      const activeUser = currentUserRef.current;
      const activeDiagram = diagramRef.current;
      if (!activeUser || !diagramId) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Throttle de emisión a 40ms (~25 FPS) para no saturar la red
      const now = Date.now();
      if (now - lastCursorEmitRef.current < 40) return;
      lastCursorEmitRef.current = now;

      wsService.sendMessage(Number(diagramId), {
        type: "CURSOR_MOVE",
        diagramId: Number(diagramId),
        userId: Number(activeUser.id),
        userName: activeUser.nombre || "Usuario",
        userRole:
          Number(activeDiagram?.idCreador) === Number(activeUser.id)
            ? "CREADOR"
            : "COLABORADOR",
        payload: JSON.stringify({
          x: Math.round(flowPos.x),
          y: Math.round(flowPos.y),
        }),
      });
    };

    container.addEventListener("pointermove", handleGlobalPointerMove as any, { capture: true });
    container.addEventListener("mousemove", handleGlobalPointerMove as any, { capture: true });
    return () => {
      container.removeEventListener("pointermove", handleGlobalPointerMove as any, { capture: true });
      container.removeEventListener("mousemove", handleGlobalPointerMove as any, { capture: true });
    };
  }, [currentUser, diagramId, diagram?.idCreador, screenToFlowPosition]);

  // Manejo de cambios en aristas
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        const hasRemoval = changes.some((c) => c.type === "remove");
        if (hasRemoval) {
          setTimeout(() => {
            broadcastCanvas(nodesRef.current, next);
          }, 0);
        }
        return next;
      });
    },
    [broadcastCanvas]
  );

  // Interceptar la conexión para desplegar el selector de tipo de relación UML
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source === connection.target && connection.sourceHandle === connection.targetHandle) {
      return;
    }
    setPendingConnection(connection);
    setIsRelationPickerOpen(true);
  }, []);

  // Confirmar creación de arista con el tipo de relación seleccionado y nombre opcional
  const handleSelectRelationType = (relationType: UmlRelationType, relationName?: string) => {
    if (!pendingConnection) return;

    const newEdgeId = `edge-${Date.now()}`;
    const newEdge: Edge = {
      ...pendingConnection,
      id: newEdgeId,
      type: "umlEdge",
      data: {
        relationType,
        sourceMultiplicity: "",
        targetMultiplicity: "",
        name: relationName || "",
      } as any,
    };

    const nextEdges = addEdge(newEdge, edges);
    setEdges(nextEdges);
    broadcastCanvas(nodes, nextEdges);
    setPendingConnection(null);
  };

  // Abrir modal de edición al hacer clic en una arista existente
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      setEdgeSourceClassName((sourceNode?.data as any)?.name || "Clase A");
      setEdgeTargetClassName((targetNode?.data as any)?.name || "Clase B");
      setEditingEdgeId(edge.id);
      setEditingEdgeData(((edge.data as unknown) as UmlEdgeData) || { relationType: "ASSOCIATION" });
      setIsEdgeEditModalOpen(true);
    },
    [nodes]
  );

  // Guardar cambios de edición de la relación
  const handleSaveEdgeEdit = (edgeId: string, updatedData: UmlEdgeData) => {
    const nextEdges = edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          type: "umlEdge",
          data: {
            ...edge.data,
            ...updatedData,
          },
        };
      }
      return edge;
    });

    setEdges(nextEdges);
    broadcastCanvas(nodes, nextEdges);
  };

  // Eliminar arista desde el modal
  const handleDeleteEdge = (edgeId: string) => {
    const nextEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(nextEdges);
    broadcastCanvas(nodes, nextEdges);
  };

  // Añadir una nueva Clase UML
  const handleAddClass = () => {
    const newId = `class-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: "umlClass",
      position: {
        x: 100 + Math.random() * 150,
        y: 100 + Math.random() * 150,
      },
      data: {
        name: `NuevaClase_${nodes.length + 1}`,
        stereotype: "",
        attributes: [
          { id: `attr-${Date.now()}-1`, visibility: "-", name: "id", type: "int" },
          { id: `attr-${Date.now()}-2`, visibility: "+", name: "nombre", type: "string" },
        ],
        methods: [
          { id: `meth-${Date.now()}-1`, visibility: "+", name: "operacion", parameters: "", returnType: "void" },
        ],
        onEdit: handleOpenEditClass,
      },
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    broadcastCanvas(nextNodes, edges);
  };

  // Añadir una nueva Nota UML
  const handleAddNote = () => {
    const newId = `note-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: "umlNote",
      position: {
        x: 120 + Math.random() * 120,
        y: 120 + Math.random() * 120,
      },
      data: {
        content: "Nota UML explicativa.",
      },
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    broadcastCanvas(nextNodes, edges);
  };

  // Guardar cambios en el modal de edición de clase
  const handleSaveClassEdit = (nodeId: string, updatedData: UmlClassData) => {
    const nextNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            name: updatedData.name,
            stereotype: updatedData.stereotype,
            attributes: updatedData.attributes,
            methods: updatedData.methods,
            onEdit: handleOpenEditClass,
          },
        };
      }
      return node;
    });

    setNodes(nextNodes);
    broadcastCanvas(nextNodes, edges);
  };

  // Eliminar nodo de clase desde el modal
  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    broadcastCanvas(nextNodes, nextEdges);
  };

  // Guardar en la base de datos (REST PUT)
  const handleSaveToBackend = async () => {
    if (!currentUser || !diagram) return;

    try {
      setIsSaving(true);
      const lienzoPayload = JSON.stringify({
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            name: (n.data as any)?.name,
            stereotype: (n.data as any)?.stereotype,
            attributes: (n.data as any)?.attributes,
            methods: (n.data as any)?.methods,
            content: (n.data as any)?.content,
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: "umlEdge",
          data: e.data,
        })),
      });

      const updated = await api.updateDiagram(diagramId, {
        lienzo: lienzoPayload,
        usuarioId: currentUser.id,
      });

      setDiagram(updated);
    } catch (err: any) {
      alert(err.message || "Error al guardar el diagrama");
    } finally {
      setIsSaving(false);
    }
  };

  // Exportar XMI para Enterprise Architect v15
  const handleExportXmi = () => {
    downloadEnterpriseArchitectXmi(diagram?.nombre || "diagrama", nodes, edges);
  };

  // Exportar JSON descargable
  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            diagramName: diagram?.nombre,
            nodes,
            edges,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${diagram?.nombre || "diagrama"}_uml.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Ejecutar instrucción con Inteligencia Artificial (Gemini 2.5 Flash)
  const handleExecuteAiPrompt = async (promptText: string) => {
    setIsAiLoading(true);
    try {
      const result = await processDiagramWithGemini(
        promptText,
        nodes,
        edges,
        diagram?.nombre || "diagrama"
      );

      // Inyectar callback onEdit en los nodos de clase
      const nextNodes = result.nodes.map((node) => {
        if (node.type === "umlClass") {
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: handleOpenEditClass,
            },
          };
        }
        return node;
      });

      setNodes(nextNodes);
      setEdges(result.edges);
      broadcastCanvas(nextNodes, result.edges);

      return result.explanation;
    } finally {
      setIsAiLoading(false);
    }
  };

  // Invitar colaborador
  const handleInviteCollaborator = async (correo: string) => {
    if (!currentUser) return;
    await api.inviteCollaborator(diagramId, correo, currentUser.id);
    const updated = await api.getDiagramById(diagramId, currentUser.id);
    setDiagram(updated);
  };

  // Retirar colaborador
  const handleRemoveCollaborator = async (collabUserId: number) => {
    if (!currentUser) return;
    await api.removeCollaborator(diagramId, collabUserId, currentUser.id);
    const updated = await api.getDiagramById(diagramId, currentUser.id);
    setDiagram(updated);
  };

  if (isLoading || !diagram) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center font-mono text-xs text-slate-500">
        Cargando lienzo de modelado UML...
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden select-none">
      {/* Cabecera Colaborativa */}
      <CollaboratorsHeader
        diagram={diagram}
        currentUser={currentUser}
        isSaving={isSaving}
        lastSavedTime={lastSavedTime}
        onSave={handleSaveToBackend}
        onInvite={handleInviteCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
      />

      {/* Contenedor del Lienzo con React Flow */}
      <div
        ref={canvasContainerRef}
        className="flex-1 relative w-full h-full min-h-0 bg-slate-50/50"
        style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 65px)" }}
      >
        {/* Marcadores SVG globales para conectores UML 2.5 */}
        <UmlEdgeMarkers />

        {/* Barra de herramientas flotante */}
        <CanvasToolbar
          onAddClass={handleAddClass}
          onAddNote={handleAddNote}
          onOpenPreview={() => setIsCodePreviewOpen(true)}
          onOpenSpringBootExport={() => setIsSpringBootExportOpen(true)}
          onOpenFlutterExport={() => setIsFlutterExportOpen(true)}
          isWsConnected={isWsConnected}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          style={{ width: "100%", height: "100%" }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          panOnDrag={[1, 2]}
          nodesDraggable={true}
          defaultEdgeOptions={{
            type: "umlEdge",
          }}
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={20} size={1} variant={BackgroundVariant.Dots} />
          {/* Controles limpios de Zoom y Centrado */}
          <CustomCanvasControls />
        </ReactFlow>

        {/* Punteros de ratón de colaboradores en tiempo real (Overlay sobre el lienzo) */}
        <CollaborativeCursors cursors={remoteCursors} />

        {/* Barra de Inteligencia Artificial (Gemini 2.5 Flash + Reconocimiento de Voz) */}
        <CanvasAiPromptBar
          onExecutePrompt={handleExecuteAiPrompt}
          isLoading={isAiLoading}
        />
      </div>

      {/* Modal para editar Clases */}
      <ClassEditModal
        isOpen={isEditModalOpen}
        nodeId={editingNodeId}
        initialData={editingNodeData}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveClassEdit}
        onDeleteNode={handleDeleteNode}
      />

      {/* Modal selector rápido de tipo de relación (al conectar) */}
      <RelationTypePickerModal
        isOpen={isRelationPickerOpen}
        onClose={() => {
          setIsRelationPickerOpen(false);
          setPendingConnection(null);
        }}
        onSelect={handleSelectRelationType}
      />

      {/* Modal para editar relación existente y multiplicidad (al hacer clic en arista) */}
      <EdgeEditModal
        isOpen={isEdgeEditModalOpen}
        edgeId={editingEdgeId}
        initialData={editingEdgeData}
        sourceClassName={edgeSourceClassName}
        targetClassName={edgeTargetClassName}
        onClose={() => {
          setIsEdgeEditModalOpen(false);
          setEditingEdgeId(null);
          setEditingEdgeData(null);
        }}
        onSave={handleSaveEdgeEdit}
        onDeleteEdge={handleDeleteEdge}
      />

      {/* Modal para Previsualizar Código (XMI / JSON) */}
      <CodePreviewModal
        isOpen={isCodePreviewOpen}
        onClose={() => setIsCodePreviewOpen(false)}
        xmiCode={xmiCode}
        jsonCode={jsonCode}
        diagramName={diagram.nombre}
        onDownloadXmi={handleExportXmi}
        onDownloadJson={handleExportJson}
      />

      {/* Modal para Generar y Exportar Proyecto Spring Boot (MVC + PostgreSQL) */}
      <SpringBootExportModal
        isOpen={isSpringBootExportOpen}
        onClose={() => setIsSpringBootExportOpen(false)}
        nodes={nodes}
        edges={edges}
        diagramName={diagram.nombre}
      />

      {/* Modal para Generar y Exportar Proyecto Flutter (Voz + IA Local) */}
      <FlutterExportModal
        isOpen={isFlutterExportOpen}
        onClose={() => setIsFlutterExportOpen(false)}
        nodes={nodes}
        edges={edges}
        diagramName={diagram.nombre}
      />
    </div>
  );
}

export default function DiagramEditorPage() {
  return (
    <ReactFlowProvider>
      <DiagramEditorContent />
    </ReactFlowProvider>
  );
}
