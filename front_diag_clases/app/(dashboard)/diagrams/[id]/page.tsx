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
import { ClassEditModal } from "@/components/canvas/ClassEditModal";
import { CollaboratorsHeader } from "@/components/canvas/CollaboratorsHeader";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { CustomCanvasControls } from "@/components/canvas/CustomCanvasControls";
import { CollaborativeCursors, RemoteCursor } from "@/components/canvas/CollaborativeCursors";
import { api } from "@/services/api";
import { wsService } from "@/services/websocket";
import { DiagramResponse, UmlClassData, User, WebSocketMessage } from "@/types";

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
  const [isPanMode, setIsPanMode] = useState(false);

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

  // Evitar bucles infinitos de sincronización WebSocket
  const isReceivingRemoteUpdate = useRef(false);

  // Tipos de nodos registrados para React Flow
  const nodeTypes = useMemo(
    () => ({
      umlClass: UmlClassNode,
      umlNote: UmlNoteNode,
    }),
    []
  );

  // Handler para abrir modal de edición de una clase
  const handleOpenEditClass = useCallback((nodeId: string, classData: UmlClassData) => {
    setEditingNodeId(nodeId);
    setEditingNodeData(classData);
    setIsEditModalOpen(true);
  }, []);

  // Limpieza periódica de cursores inactivos (más de 5 segundos sin actualización)
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

        // Parsear lienzo inicial
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
            setNodes(loadedNodes);
            setEdges(parsed.edges || []);
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
        // Notificar presencia al ingresar
        wsService.sendMessage(diagramId, {
          type: "JOIN",
          diagramId,
          userId: currentUser.id,
          userName: currentUser.nombre,
          userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
          payload: "",
        });

        // Suscribirse al canal del diagrama
        wsService.subscribeToDiagram(diagramId, (msg: WebSocketMessage) => {
          const activeUser = currentUserRef.current;
          if (!activeUser) return;

          // Ignorar nuestros propios ecos convirtiendo a número para evitar discrepancia de tipo string/number
          if (Number(msg.userId) === Number(activeUser.id)) return;

          // Sincronización del puntero del mouse en tiempo real
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

          // Salida de colaborador
          if (msg.type === "LEAVE") {
            setRemoteCursors((prev) => {
              const next = { ...prev };
              delete next[msg.userId];
              return next;
            });
            return;
          }

          // Movimiento de nodo (arrastre suave)
          if (msg.type === "NODE_MOVE" && msg.payload) {
            try {
              const { id, position } = JSON.parse(msg.payload);
              // Si el usuario local está arrastrando este mismo nodo, no sobreescribir su posición local
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

          // Sincronización completa del lienzo
          if (msg.type === "SYNC_CANVAS" && msg.payload) {
            try {
              isReceivingRemoteUpdate.current = true;
              const remote = JSON.parse(msg.payload);
              
              if (remote.nodes) {
                setNodes((currentNodes) => {
                  const remoteMap = new Map(remote.nodes.map((n: Node) => [n.id, n]));
                  const nextNodes = [...currentNodes];
                  let changed = false;

                  // Actualizar nodos existentes
                  for (let i = 0; i < nextNodes.length; i++) {
                    const existing = nextNodes[i];
                    const remoteNode = remoteMap.get(existing.id);
                    if (remoteNode) {
                      // Verificar si hubo cambios reales para evitar re-renders innecesarios
                      const posChanged = existing.position.x !== remoteNode.position.x || existing.position.y !== remoteNode.position.y;
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
                      // Eliminar del mapa para saber cuáles son nuevos
                      remoteMap.delete(existing.id);
                    }
                  }

                  // Añadir nodos nuevos que llegaron remotamente
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

                  // Eliminar nodos que ya no están en la lista remota
                  const finalNodes = nextNodes.filter((n) => {
                    const keep = remote.nodes.some((rn: Node) => rn.id === n.id);
                    if (!keep) changed = true;
                    return keep;
                  });

                  return changed ? finalNodes : currentNodes;
                });
              }
              
              if (remote.edges) {
                setEdges(remote.edges);
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

  // Difundir cambios a colaboradores
  const broadcastCanvas = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
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
        edges: newEdges,
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
    [currentUser, diagramId, diagram?.idCreador]
  );

  // Manejo de cambios de nodos (selección, dimensiones, remoción)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Si se eliminó un nodo localmente, difundir cambio estructural
      const hasRemoval = changes.some((c) => c.type === "remove");
      if (hasRemoval) {
        setTimeout(() => {
          broadcastCanvas(nodesRef.current, edgesRef.current);
        }, 0);
      }
    },
    [broadcastCanvas]
  );

  // Referencia para rastrear si el usuario local está arrastrando un nodo
  const draggingNodeIdRef = useRef<string | null>(null);

  const onNodeDragStart: OnNodeDrag = useCallback((_event, node) => {
    draggingNodeIdRef.current = node.id;
  }, []);

  // Sincronización en vivo del arrastre de nodos
  const lastNodeDragBroadcastRef = useRef<number>(0);
  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      draggingNodeIdRef.current = node.id;
      if (!currentUser || isReceivingRemoteUpdate.current) return;
      const now = performance.now();
      if (now - lastNodeDragBroadcastRef.current > 35) {
        lastNodeDragBroadcastRef.current = now;
        
        // Emitir únicamente el nodo que se mueve para no sobreescribir el lienzo entero
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

  // Sincronización definitiva al soltar el nodo arrastrado
  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node) => {
      draggingNodeIdRef.current = null;
      // Usar un setTimeout para asegurar que el estado de React Flow se haya asentado
      setTimeout(() => {
        broadcastCanvas(nodesRef.current, edgesRef.current);
      }, 50);
    },
    [broadcastCanvas]
  );

  // Ref del contenedor del lienzo para captura global de puntero
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Emisión continua del movimiento del cursor local sobre TODO el lienzo (incluso durante arrastre)
  const lastCursorSentRef = useRef<number>(0);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      const activeUser = currentUserRef.current;
      const activeDiagram = diagramRef.current;
      if (!activeUser || !diagramId) return;
      const now = performance.now();
      // Throttle de 30ms (~33 fps) para fluidez absoluta sin saturar WebSocket
      if (now - lastCursorSentRef.current < 30) return;
      lastCursorSentRef.current = now;

      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      if (isNaN(flowPos.x) || isNaN(flowPos.y)) return;

      wsService.sendMessage(diagramId, {
        type: "CURSOR_MOVE",
        diagramId,
        userId: activeUser.id,
        userName: activeUser.nombre,
        userRole: Number(activeDiagram?.idCreador) === Number(activeUser.id) ? "CREADOR" : "COLABORADOR",
        payload: JSON.stringify({
          x: Math.round(flowPos.x),
          y: Math.round(flowPos.y),
        }),
      });
    };

    // Escuchar pointermove y mousemove en fase CAPTURE para interceptar todo movimiento
    container.addEventListener("pointermove", handleGlobalPointerMove, { capture: true });
    container.addEventListener("mousemove", handleGlobalPointerMove, { capture: true });
    return () => {
      container.removeEventListener("pointermove", handleGlobalPointerMove, { capture: true });
      container.removeEventListener("mousemove", handleGlobalPointerMove, { capture: true });
    };
  }, [currentUser, diagramId, diagram?.idCreador, screenToFlowPosition]);

  // Manejo de cambios en aristas
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        broadcastCanvas(nodesRef.current, next);
        return next;
      });
    },
    [broadcastCanvas]
  );

  // Conectar dos nodos (crear arista UML)
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            type: "smoothstep",
            style: { stroke: "#475569", strokeWidth: 1.5 },
          },
          eds
        );
        broadcastCanvas(nodes, next);
        return next;
      });
    },
    [nodes, broadcastCanvas]
  );

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
        attributes: ["- id: int", "+ nombre: string"],
        methods: ["+ operacion(): void"],
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
        edges,
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
        onSave={handleSaveToBackend}
        onInvite={handleInviteCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
      />

      {/* Contenedor del Lienzo con React Flow */}
      <div ref={canvasContainerRef} className="flex-1 relative w-full h-full bg-slate-50/50">
        {/* Barra de herramientas flotante */}
        <CanvasToolbar
          onAddClass={handleAddClass}
          onAddNote={handleAddNote}
          onExportJson={handleExportJson}
          isWsConnected={isWsConnected}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          panOnDrag={[1, 2]}
          nodesDraggable={true}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { stroke: "#475569", strokeWidth: 1.5 },
          }}
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={20} size={1} variant={BackgroundVariant.Dots} />
          {/* Controles limpios de Zoom y Centrado */}
          <CustomCanvasControls />
        </ReactFlow>

        {/* Punteros de ratón de colaboradores en tiempo real (Overlay sobre el lienzo) */}
        <CollaborativeCursors cursors={remoteCursors} />
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
