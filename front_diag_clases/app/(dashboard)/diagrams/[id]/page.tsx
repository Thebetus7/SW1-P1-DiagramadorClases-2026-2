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

import { AlertCircle, X } from "lucide-react";
import { UmlClassNode } from "@/components/canvas/UmlClassNode";
import { UmlNoteNode } from "@/components/canvas/UmlNoteNode";
import { UmlEdge } from "@/components/canvas/UmlEdge";
import { UmlAssociationClassEdge } from "@/components/canvas/UmlAssociationClassEdge";
import { UmlEdgeMarkers } from "@/components/canvas/UmlEdgeMarkers";
import { ClassEditModal } from "@/components/canvas/ClassEditModal";
import { NoteEditModal } from "@/components/canvas/NoteEditModal";
import { RelationTypePickerModal } from "@/components/canvas/RelationTypePickerModal";
import { EdgeEditModal } from "@/components/canvas/EdgeEditModal";
import { CodePreviewModal } from "@/components/canvas/CodePreviewModal";
import { SpringBootExportModal } from "@/components/canvas/SpringBootExportModal";
import { FlutterExportModal } from "@/components/canvas/FlutterExportModal";
import { CanvasImageImportModal } from "@/components/canvas/CanvasImageImportModal";
import { CollaboratorsHeader } from "@/components/canvas/CollaboratorsHeader";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { CanvasCopilotBubble } from "@/components/canvas/CanvasCopilotBubble";
import { CanvasCopilotDrawer } from "@/components/canvas/CanvasCopilotDrawer";
import { CanvasMobileLinkModal } from "@/components/canvas/CanvasMobileLinkModal";
import { CustomCanvasControls } from "@/components/canvas/CustomCanvasControls";
import { CollaborativeCursors, RemoteCursor } from "@/components/canvas/CollaborativeCursors";
import { api } from "@/services/api";
import { wsService } from "@/services/websocket";
import {
  fetchChatHistory,
  saveChatMessage,
  resolveProposal,
} from "@/services/diagramChatService";
import {
  chatWithCopilot,
  generateProactiveSuggestion,
  processDiagramWithGemini,
  convertImageToDiagramWithGemini,
} from "@/services/geminiDiagramService";
import { ChatMessage, ChatProposalPayload, CopilotMode } from "@/types";
import {
  downloadEnterpriseArchitectXmi,
  generateEnterpriseArchitectXmi,
} from "@/services/xmiExporter";
import {
  DiagramResponse,
  ImportCanvasMode,
  UmlClassData,
  UmlEdgeData,
  UmlNoteData,
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

  // Modal de edición de nota
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteData, setEditingNoteData] = useState<UmlNoteData | null>(null);
  const [isNoteEditModalOpen, setIsNoteEditModalOpen] = useState(false);

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

  // Modal de importación de imagen con Gemini Vision en lienzo activo
  const [isCanvasImageImportOpen, setIsCanvasImageImportOpen] = useState(false);
  const [isImageImporting, setIsImageImporting] = useState(false);

  // Estados para Copilot IA (Drawer, Historial MongoDB y Alertas)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<ChatMessage[]>([]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [isProactiveThinking, setIsProactiveThinking] = useState(false);
  const [applyingProposalId, setApplyingProposalId] = useState<string | null>(null);
  const [aiQuotaError, setAiQuotaError] = useState<string | null>(null);
  const [copilotUnreadCount, setCopilotUnreadCount] = useState(0);

  // Guardas de concurrencia y deduplicación para Copilot IA
  const isCopilotProcessingRef = useRef(false);
  const isProactiveRunningRef = useRef(false);
  const lastProactiveCanvasHashRef = useRef<string>("");

  // Inserción segura y deduplicada de mensajes en el chat de Copilot
  const appendCopilotMessage = useCallback((newMsg: ChatMessage) => {
    setCopilotMessages((prev) => {
      // 1. Deduplicar por ID único de MongoDB
      if (newMsg.id && prev.some((m) => m.id === newMsg.id)) {
        return prev;
      }
      // 2. Deduplicar por coincidencia idéntica de contenido y sender en ventana temporal (< 4000ms)
      const isDuplicate = prev.some(
        (m) =>
          m.content === newMsg.content &&
          m.senderType === newMsg.senderType &&
          Math.abs(new Date(m.createdAt || 0).getTime() - new Date(newMsg.createdAt || 0).getTime()) < 4000
      );
      if (isDuplicate) {
        return prev;
      }
      return [...prev, newMsg];
    });
  }, []);

  // Modal para vincular visor móvil Flutter por QR / Enlace
  const [isMobileLinkModalOpen, setIsMobileLinkModalOpen] = useState(false);

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

  // Alerta informativa flotante (RB-01)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const edgeTypes = useMemo(
    () => ({
      umlEdge: UmlEdge,
      umlAssociationClassEdge: UmlAssociationClassEdge,
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

  // Handler para abrir modal de edición de una nota
  const handleOpenEditNote = useCallback((nodeId: string, noteData: UmlNoteData) => {
    setEditingNoteId(nodeId);
    setEditingNoteData(noteData);
    setIsNoteEditModalOpen(true);
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
                onEdit: node.type === "umlNote" ? handleOpenEditNote : handleOpenEditClass,
              },
            }));

            const loadedEdges = (parsed.edges || []).map((edge: Edge) => {
              const isAssoc =
                edge.type === "umlAssociationClassEdge" ||
                (edge.data as any)?.relationType === "ASSOCIATION_CLASS" ||
                (edge.data as any)?.isAssociationClass === true ||
                !!(edge.data as any)?.targetEdgeId;

              return {
                ...edge,
                type: isAssoc ? "umlAssociationClassEdge" : "umlEdge",
                data: {
                  ...edge.data,
                  relationType: (edge.data as any)?.relationType || "ASSOCIATION",
                  sourceMultiplicity: (edge.data as any)?.sourceMultiplicity || "",
                  targetMultiplicity: (edge.data as any)?.targetMultiplicity || "",
                  name: (edge.data as any)?.name || "",
                  targetEdgeId: (edge.data as any)?.targetEdgeId || undefined,
                  sourceClassId: (edge.data as any)?.sourceClassId || undefined,
                  targetClassId: (edge.data as any)?.targetClassId || undefined,
                  intermediateNodeId: (edge.data as any)?.intermediateNodeId || undefined,
                  isAssociationClass: isAssoc ? true : undefined,
                },
              };
            });

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
  }, [currentUser, diagramId, handleOpenEditClass, handleOpenEditNote]);

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
                            onEdit:
                              existing.type === "umlNote" || remoteNode.type === "umlNote"
                                ? handleOpenEditNote
                                : handleOpenEditClass,
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
                        onEdit:
                          remoteNode.type === "umlNote"
                            ? handleOpenEditNote
                            : handleOpenEditClass,
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
                    type: e.type === "umlAssociationClassEdge" ? "umlAssociationClassEdge" : "umlEdge",
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

          // Manejo de mensajes de chat o sugerencias proactivas compartidas
          if (msg.type === "CHAT_MESSAGE" || msg.type === "PROACTIVE_SUGGESTION") {
            try {
              const chatItem: ChatMessage = JSON.parse(msg.payload);
              // Deduplicar mensaje antes de añadirlo y antes de incrementar contador de no leídos
              setCopilotMessages((prev) => {
                if (chatItem.id && prev.some((m) => m.id === chatItem.id)) {
                  return prev;
                }
                const isDuplicate = prev.some(
                  (m) =>
                    m.content === chatItem.content &&
                    m.senderType === chatItem.senderType &&
                    Math.abs(new Date(m.createdAt || 0).getTime() - new Date(chatItem.createdAt || 0).getTime()) < 4000
                );
                if (isDuplicate) {
                  return prev;
                }
                // Si el mensaje es efectivamente nuevo y proviene de otro usuario o sistema, incrementar contador
                if (msg.userId !== currentUserRef.current?.id) {
                  setCopilotUnreadCount((count) => count + 1);
                }
                return [...prev, chatItem];
              });
            } catch (e) {
              console.error("Error al procesar CHAT_MESSAGE por WebSocket:", e);
            }
            return;
          }

          // Manejo de resolución de propuestas interactivas en vivo
          if (msg.type === "PROPOSAL_RESOLVED") {
            try {
              const { messageId, status, resolvedByUserName } = JSON.parse(msg.payload);
              setCopilotMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? {
                        ...m,
                        proposalStatus: status,
                        resolvedByUserName,
                        proposal: m.proposal ? { ...m.proposal, status, resolvedByUserName } : null,
                      }
                    : m
                )
              );
            } catch (e) {
              console.error("Error al procesar PROPOSAL_RESOLVED por WebSocket:", e);
            }
            return;
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
  }, [currentUser, diagramId, diagram?.idCreador, handleOpenEditClass, handleOpenEditNote]);

  // Cargar historial de chat colaborativo persistido en MongoDB
  useEffect(() => {
    if (!diagramId) return;
    fetchChatHistory(diagramId)
      .then((history) => {
        // Deduplicar historial por ID antes de setearlo en el estado
        const uniqueHistory: ChatMessage[] = [];
        const seenIds = new Set<string>();
        for (const item of history || []) {
          if (item.id) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              uniqueHistory.push(item);
            }
          } else {
            uniqueHistory.push(item);
          }
        }
        setCopilotMessages(uniqueHistory);
      })
      .catch((err) => {
        console.warn("Aviso: No se pudo cargar el historial de chat de MongoDB:", err);
      });
  }, [diagramId]);

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
              type: e.type || "umlEdge",
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
          type: e.type || "umlEdge",
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

  // Manejo de cambios en aristas con eliminación en cascada de conectores en 'T' si la arista base desaparece
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const removedEdgeIds = changes
          .filter((c): c is { type: "remove"; id: string } => c.type === "remove")
          .map((c) => c.id);

        let next = applyEdgeChanges(changes, eds);

        if (removedEdgeIds.length > 0) {
          // Si se eliminó una arista base, remover en cascada su conector en 'T' asociado
          next = next.filter((e) => {
            if (e.type === "umlAssociationClassEdge") {
              const targetEdgeId = (e.data as any)?.targetEdgeId;
              if (targetEdgeId && removedEdgeIds.includes(targetEdgeId)) {
                return false;
              }
            }
            return true;
          });

          setTimeout(() => {
            broadcastCanvas(nodesRef.current, next);
          }, 0);
        }
        return next;
      });
    },
    [broadcastCanvas]
  );

  // Referencia mutable para debounce de sugerencias proactivas ante cambios semánticos (T5.1)
  const proactiveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Disparar sugerencia proactiva ante cambios estructurales con guard de concurrencia y hash
  const triggerProactiveSuggestion = useCallback(
    async (authorName: string, updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (!diagramId || !authorName || isProactiveRunningRef.current) return;

      // Evitar sugerencias duplicadas sobre el mismo estado del canvas
      const canvasHash = JSON.stringify({
        nodes: updatedNodes.map((n) => ({ id: n.id, name: n.data?.name, attrs: (n.data as any)?.attributes })),
        edges: updatedEdges.map((e) => ({ s: e.source, t: e.target, rel: (e.data as any)?.relationType })),
      });
      if (canvasHash === lastProactiveCanvasHashRef.current) {
        setIsProactiveThinking(false);
        return;
      }
      lastProactiveCanvasHashRef.current = canvasHash;

      isProactiveRunningRef.current = true;
      try {
        setIsProactiveThinking(true);
        const suggestion = await generateProactiveSuggestion(
          updatedNodes,
          updatedEdges,
          diagram?.nombre || "diagrama",
          authorName
        );

        if (!suggestion) return;

        const suggestionMsg: Partial<ChatMessage> = {
          diagramId,
          senderType: "COPILOT",
          userName: "Copilot IA",
          mode: "CHAT",
          messageType: "PROACTIVE_SUGGESTION",
          content: suggestion.content,
          taggedUserName: suggestion.taggedUserName,
          proposal: suggestion.proposal,
          proposalStatus: suggestion.proposal ? "PENDING" : undefined,
          proposalJson: suggestion.proposal ? JSON.stringify(suggestion.proposal) : undefined,
          isError: false,
          createdAt: new Date().toISOString(),
        };

        const saved = await saveChatMessage(diagramId, suggestionMsg);
        appendCopilotMessage(saved);
        setCopilotUnreadCount((prev) => prev + 1);

        // Difundir sugerencia a colaboradores
        wsService.sendMessage(diagramId, {
          type: "PROACTIVE_SUGGESTION",
          diagramId,
          userId: 0,
          userName: "Copilot IA",
          userRole: "SISTEMA",
          payload: JSON.stringify(saved),
        });
      } catch (err: any) {
        console.warn("Aviso al generar sugerencia proactiva:", err);
        if (err.message?.includes("IA saturada")) {
          setAiQuotaError("IA saturada, vuelve a escribir");
        }
      } finally {
        isProactiveRunningRef.current = false;
        setIsProactiveThinking(false);
      }
    },
    [diagramId, diagram, appendCopilotMessage]
  );

  const scheduleProactiveSuggestion = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const author = currentUserRef.current?.nombre;
      if (!author || !diagramId) return;

      setIsProactiveThinking(true);

      if (proactiveDebounceRef.current) {
        clearTimeout(proactiveDebounceRef.current);
      }

      proactiveDebounceRef.current = setTimeout(() => {
        triggerProactiveSuggestion(author, nextNodes, nextEdges);
      }, 1500);
    },
    [diagramId, triggerProactiveSuggestion]
  );

  useEffect(() => {
    return () => {
      if (proactiveDebounceRef.current) {
        clearTimeout(proactiveDebounceRef.current);
      }
      setIsProactiveThinking(false);
    };
  }, []);

  // Registro del nodo que inició el arrastre del conector para posibilitar soltar sobre arista base
  const connectingNodeIdRef = useRef<string | null>(null);

  const onConnectStart = useCallback((_event: any, params: any) => {
    connectingNodeIdRef.current = params.nodeId || null;
  }, []);

  // Detección al soltar el conector sobre una arista existente para crear una Clase de Asociación en 'T'
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceNodeId = connectingNodeIdRef.current;
      connectingNodeIdRef.current = null;
      if (!sourceNodeId) return;

      let clientX = 0;
      let clientY = 0;
      if ("clientX" in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else if ("touches" in event && event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ("changedTouches" in event && event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      }

      if (clientX === 0 && clientY === 0) return;

      const targetEl = document.elementFromPoint(clientX, clientY);
      const edgeHitbox = targetEl?.closest("[data-edge-id]");
      const targetEdgeId = edgeHitbox?.getAttribute("data-edge-id");

      if (targetEdgeId) {
        const baseEdge = edges.find((e) => e.id === targetEdgeId);
        if (!baseEdge) return;

        // No conectar a otro conector en 'T' (no n-arias)
        if (baseEdge.type === "umlAssociationClassEdge") return;

        // No conectar una clase a una relación de la que ya forma parte directa
        if (baseEdge.source === sourceNodeId || baseEdge.target === sourceNodeId) {
          return;
        }

        // T2.2 / RB-01: Regla de Unicidad (Máximo 1 clase de asociación por relación)
        const existingAssoc = edges.find(
          (e) =>
            e.type === "umlAssociationClassEdge" &&
            ((e.data as any)?.targetEdgeId === targetEdgeId ||
              ((e.data as any)?.sourceClassId === baseEdge.source &&
                (e.data as any)?.targetClassId === baseEdge.target))
        );
        if (existingAssoc) {
          setToastMessage("Esta relación ya cuenta con una clase de asociación vinculada");
          return;
        }

        // Crear conector en T de tipo umlAssociationClassEdge
        const newEdgeId = `assoc-edge-${Date.now()}`;
        const newAssocEdge: Edge = {
          id: newEdgeId,
          source: sourceNodeId,
          target: baseEdge.source,
          type: "umlAssociationClassEdge",
          data: {
            relationType: "ASSOCIATION_CLASS",
            isAssociationClass: true,
            targetEdgeId: baseEdge.id,
            sourceClassId: baseEdge.source,
            targetClassId: baseEdge.target,
            intermediateNodeId: sourceNodeId,
            name: "",
          } as any,
        };

        const nextEdges = [...edges, newAssocEdge];
        setEdges(nextEdges);
        broadcastCanvas(nodes, nextEdges);
        scheduleProactiveSuggestion(nodes, nextEdges);
      }
    },
    [edges, nodes, broadcastCanvas, scheduleProactiveSuggestion]
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
    scheduleProactiveSuggestion(nodes, nextEdges);
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
          type: edge.type || "umlEdge",
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
    scheduleProactiveSuggestion(nodes, nextEdges);
  };

  // Eliminar arista desde el modal con preservación de arista base (T2.3)
  const handleDeleteEdge = (edgeId: string) => {
    const edgeToDelete = edges.find((e) => e.id === edgeId);
    let nextEdges: Edge[];
    if (edgeToDelete?.type === "umlAssociationClassEdge") {
      // T2.3 Desvinculación limpia: si se elimina la arista en T, solo se remueve la T
      nextEdges = edges.filter((e) => e.id !== edgeId);
    } else {
      // Si se elimina la arista base, remover en cascada su conector en 'T' asociado
      nextEdges = edges.filter((e) => {
        if (e.id === edgeId) return false;
        if (e.type === "umlAssociationClassEdge" && (e.data as any)?.targetEdgeId === edgeId) {
          return false;
        }
        return true;
      });
    }
    setEdges(nextEdges);
    broadcastCanvas(nodes, nextEdges);
    scheduleProactiveSuggestion(nodes, nextEdges);
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
    scheduleProactiveSuggestion(nextNodes, edges);
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
        onEdit: handleOpenEditNote,
      },
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    broadcastCanvas(nextNodes, edges);
    scheduleProactiveSuggestion(nextNodes, edges);
  };

  // Guardar cambios en el modal de edición de nota
  const handleSaveNoteEdit = (nodeId: string, content: string) => {
    const nextNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            content,
            onEdit: handleOpenEditNote,
          },
        };
      }
      return node;
    });

    setNodes(nextNodes);
    broadcastCanvas(nextNodes, edges);
    scheduleProactiveSuggestion(nextNodes, edges);
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
    scheduleProactiveSuggestion(nextNodes, edges);
  };

  // Eliminar nodo de clase desde el modal preservando aristas base no afectadas
  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const deletedDirectEdgeIds = edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => e.id);

    const nextEdges = edges.filter((e) => {
      if (e.source === nodeId || e.target === nodeId) return false;
      if (e.type === "umlAssociationClassEdge") {
        if ((e.data as any)?.intermediateNodeId === nodeId) return false;
        if (deletedDirectEdgeIds.includes((e.data as any)?.targetEdgeId)) return false;
      }
      return true;
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
    broadcastCanvas(nextNodes, nextEdges);
    scheduleProactiveSuggestion(nextNodes, nextEdges);
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
          type: e.type || "umlEdge",
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

  // =========================================================================
  // COPILOT IA: ENVÍO DUAL, PROPUESTAS INTERACTIVAS Y SUGERENCIAS PROACTIVAS
  // =========================================================================

  // Enviar mensaje al Copilot IA (Modo Chat o Modo Editor) con guardia de concurrencia y deduplicación
  const handleSendCopilotMessage = async (content: string, mode: CopilotMode) => {
    if (!diagramId || !currentUser || !content.trim() || isCopilotLoading || isCopilotProcessingRef.current) return;
    isCopilotProcessingRef.current = true;
    setIsCopilotLoading(true);
    setAiQuotaError(null);

    // 1. Crear y persistir mensaje del usuario en MongoDB
    const userMsg: Partial<ChatMessage> = {
      diagramId,
      senderType: "USER",
      userId: currentUser.id,
      userName: currentUser.nombre,
      mode,
      messageType: "CHAT_MESSAGE",
      content,
      isError: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const savedUserMsg = await saveChatMessage(diagramId, userMsg);
      appendCopilotMessage(savedUserMsg);

      // Difundir mensaje de usuario por WebSocket a otros colaboradores
      wsService.sendMessage(diagramId, {
        type: "CHAT_MESSAGE",
        diagramId,
        userId: currentUser.id,
        userName: currentUser.nombre,
        userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
        payload: JSON.stringify(savedUserMsg),
      });

      // 2. Invocar Copilot IA (Gemini 2.5 Flash)
      const aiResponse = await chatWithCopilot(
        content,
        mode,
        nodes,
        edges,
        diagram?.nombre || "diagrama"
      );

      // 3. Crear y persistir mensaje de respuesta de la IA
      const copilotMsg: Partial<ChatMessage> = {
        diagramId,
        senderType: "COPILOT",
        userName: "Copilot IA",
        mode,
        messageType: aiResponse.proposal ? "EDITOR_PROPOSAL" : "CHAT_MESSAGE",
        content: aiResponse.replyText,
        proposal: aiResponse.proposal,
        proposalStatus: aiResponse.proposal ? "PENDING" : undefined,
        proposalJson: aiResponse.proposal ? JSON.stringify(aiResponse.proposal) : undefined,
        isError: false,
        createdAt: new Date().toISOString(),
      };

      const savedCopilotMsg = await saveChatMessage(diagramId, copilotMsg);
      appendCopilotMessage(savedCopilotMsg);

      // Difundir respuesta de Copilot a colaboradores
      wsService.sendMessage(diagramId, {
        type: aiResponse.proposal ? "PROACTIVE_SUGGESTION" : "CHAT_MESSAGE",
        diagramId,
        userId: 0,
        userName: "Copilot IA",
        userRole: "SISTEMA",
        payload: JSON.stringify(savedCopilotMsg),
      });
    } catch (err: any) {
      console.warn("Aviso en interacción con Copilot:", err);
      if (err.message?.includes("IA saturada") || err.message?.includes("429")) {
        setAiQuotaError("IA saturada, vuelve a escribir");
      } else {
        setAiQuotaError(err.message || "Error al comunicarse con la IA.");
      }
    } finally {
      isCopilotProcessingRef.current = false;
      setIsCopilotLoading(false);
    }
  };

  // Aceptar propuesta de Copilot (Aplica mutación al lienzo y difunde)
  const handleAcceptProposal = async (messageId: string, proposal?: ChatProposalPayload | null) => {
    if (!diagramId || !currentUser) return;
    try {
      setApplyingProposalId(messageId);
      setIsCopilotLoading(true);

      let nextNodes: Node[] = [];
      let nextEdges: Edge[] = [];
      let appliedExplanation = "";

      // Caso A: La propuesta ya traía deltas de nodos precalculados
      if (proposal?.nodesDelta && proposal.nodesDelta.length > 0) {
        const existingNodeIds = new Set(nodes.map((n) => n.id));

        nextNodes = proposal.nodesDelta.map((node: any) => {
          const isAffected = !existingNodeIds.has(node.id) || proposal.affectedNodeIds?.includes(node.id);
          return {
            ...node,
            data: {
              ...node.data,
              isHighlighted: isAffected,
              onEdit: node.type === "umlNote" ? handleOpenEditNote : handleOpenEditClass,
            },
          };
        });

        nextEdges = proposal.edgesDelta || edges;
        appliedExplanation = proposal.summary || "Cambios propuestos aplicados al lienzo.";
      } else {
        // Caso B: La propuesta no traía delta (ej: sugerencia proactiva textual).
        // Extraemos la instrucción y calculamos la mutación en vivo con Gemini.
        const originalMsg = copilotMessages.find((m) => m.id === messageId);
        let instruction = proposal?.summary || "";
        if (!instruction && originalMsg?.content) {
          // Remover prefijo "@NombreUsuario:" si existe
          instruction = originalMsg.content.replace(/^@[^:]+:\s*/, "").trim();
        }

        if (instruction) {
          const result = await processDiagramWithGemini(
            instruction,
            nodes,
            edges,
            diagram?.nombre || "diagrama"
          );

          appliedExplanation = result.explanation;

          // Detectar qué nodos cambiaron o son nuevos respecto al lienzo actual
          const existingNodeMap = new Map(nodes.map((n) => [n.id, n]));
          const existingNodeByName = new Map(nodes.map((n) => [(n.data as any)?.name?.toLowerCase(), n]));

          nextNodes = result.nodes.map((node: any) => {
            const prevNode = existingNodeMap.get(node.id) || existingNodeByName.get(node.data?.name?.toLowerCase());
            let isModified = !prevNode;
            if (prevNode) {
              const prevAttrs = JSON.stringify(prevNode.data?.attributes || []);
              const nextAttrs = JSON.stringify(node.data?.attributes || []);
              const prevMethods = JSON.stringify(prevNode.data?.methods || []);
              const nextMethods = JSON.stringify(node.data?.methods || []);
              const prevName = prevNode.data?.name;
              const nextName = node.data?.name;
              if (prevAttrs !== nextAttrs || prevMethods !== nextMethods || prevName !== nextName) {
                isModified = true;
              }
            }
            return {
              ...node,
              data: {
                ...node.data,
                isHighlighted: isModified,
                onEdit: node.type === "umlNote" ? handleOpenEditNote : handleOpenEditClass,
              },
            };
          });

          nextEdges = result.edges;
        }
      }

      // Si tenemos nodos modificados para aplicar al lienzo
      if (nextNodes.length > 0) {
        setNodes(nextNodes);
        setEdges(nextEdges);
        broadcastCanvas(nextNodes, nextEdges);

        // Desactivar resaltado luminoso tras 2.5 segundos
        setTimeout(() => {
          setNodes((current) =>
            current.map((n) =>
              (n.data as any)?.isHighlighted
                ? { ...n, data: { ...n.data, isHighlighted: false } }
                : n
            )
          );
        }, 2500);

        // Persistir inmediatamente el lienzo actualizado en PostgreSQL
        try {
          const lienzoPayload = JSON.stringify({
            nodes: nextNodes.map((n: any) => ({
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
            edges: nextEdges.map((e: any) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              type: e.type || "umlEdge",
              data: e.data,
            })),
          });

          api.updateDiagram(diagramId, {
            lienzo: lienzoPayload,
            usuarioId: currentUser.id,
          }).catch((err) => console.warn("Aviso al auto-guardar propuesta en PostgreSQL:", err));
        } catch (e) {
          console.warn("Error al serializar payload de lienzo:", e);
        }
      }

      // Actualizar estado en MongoDB
      const updated = await resolveProposal(diagramId, messageId, "ACCEPTED", currentUser.id, currentUser.nombre);

      // Actualizar estado local
      setCopilotMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updated : m))
      );

      // Difundir resolución a colaboradores por WebSocket
      wsService.sendMessage(diagramId, {
        type: "PROPOSAL_RESOLVED",
        diagramId,
        userId: currentUser.id,
        userName: currentUser.nombre,
        userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
        payload: JSON.stringify({
          messageId,
          status: "ACCEPTED",
          resolvedByUserName: currentUser.nombre,
        }),
      });

      // Emitir mensaje explícito de Copilot confirmando las modificaciones aplicadas al lienzo (acordado en /grill-me)
      try {
        const confirmationContent =
          appliedExplanation ||
          (proposal?.summary
            ? `He aplicado la propuesta: ${proposal.summary}`
            : "He aplicado con éxito los cambios de la sugerencia al lienzo UML.");

        const confirmationMsg: Partial<ChatMessage> = {
          diagramId,
          senderType: "COPILOT",
          userName: "Copilot IA",
          mode: "EDITOR",
          messageType: "CHAT_MESSAGE",
          content: confirmationContent,
          isError: false,
          createdAt: new Date().toISOString(),
        };

        const savedConfirmation = await saveChatMessage(diagramId, confirmationMsg);
        appendCopilotMessage(savedConfirmation);

        wsService.sendMessage(diagramId, {
          type: "CHAT_MESSAGE",
          diagramId,
          userId: 0,
          userName: "Copilot IA",
          userRole: "SISTEMA",
          payload: JSON.stringify(savedConfirmation),
        });
      } catch (confirmErr) {
        console.warn("Aviso al emitir mensaje de confirmación de Copilot:", confirmErr);
      }

      setToastMessage("Propuesta de Copilot aplicada con éxito al lienzo.");
    } catch (err: any) {
      console.error("Error al aceptar propuesta:", err);
      setToastMessage(err.message || "No se pudo aceptar la propuesta.");
    } finally {
      setApplyingProposalId(null);
      setIsCopilotLoading(false);
    }
  };

  // Ignorar propuesta de Copilot
  const handleIgnoreProposal = async (messageId: string) => {
    if (!diagramId || !currentUser) return;
    try {
      const updated = await resolveProposal(diagramId, messageId, "IGNORED", currentUser.id, currentUser.nombre);

      setCopilotMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updated : m))
      );

      wsService.sendMessage(diagramId, {
        type: "PROPOSAL_RESOLVED",
        diagramId,
        userId: currentUser.id,
        userName: currentUser.nombre,
        userRole: diagram?.idCreador === currentUser.id ? "CREADOR" : "COLABORADOR",
        payload: JSON.stringify({
          messageId,
          status: "IGNORED",
          resolvedByUserName: currentUser.nombre,
        }),
      });
    } catch (err: any) {
      console.error("Error al ignorar propuesta:", err);
    }
  };



  // Importar y procesar imagen con Gemini Vision (Reemplazar vs Fusionar con cálculo espacial armónico)
  const handleCanvasImageImport = async (
    base64Data: string,
    mimeType: string,
    mode: ImportCanvasMode
  ) => {
    try {
      setIsImageImporting(true);
      const result = await convertImageToDiagramWithGemini(base64Data, mimeType);

      if (!result.nodes || result.nodes.length === 0) {
        setToastMessage("No se detectaron clases ni elementos UML legibles en la imagen.");
        return;
      }

      if (mode === "REPLACE") {
        const nextNodes = result.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            onEdit: n.type === "umlNote" ? handleOpenEditNote : handleOpenEditClass,
          },
        }));
        const nextEdges = result.edges.map((e) => ({
          ...e,
          type: e.type || "umlEdge",
        }));
        setNodes(nextNodes);
        setEdges(nextEdges);
        broadcastCanvas(nextNodes, nextEdges);
        setToastMessage(`Lienzo reemplazado con éxito (${nextNodes.length} clases importadas)`);
      } else {
        // Modo MERGE: Cálculo armónico de layout espacial para evitar solapamientos
        let maxX = 0;
        let minY = Infinity;
        if (nodes.length > 0) {
          for (const n of nodes) {
            const nodeWidth = (n.measured?.width ?? (n as any).width ?? 220);
            const rightEdge = n.position.x + nodeWidth;
            if (rightEdge > maxX) maxX = rightEdge;
            if (n.position.y < minY) minY = n.position.y;
          }
        }
        if (minY === Infinity) minY = 100;

        let importMinX = Infinity;
        let importMinY = Infinity;
        for (const n of result.nodes) {
          if (n.position.x < importMinX) importMinX = n.position.x;
          if (n.position.y < importMinY) importMinY = n.position.y;
        }
        if (importMinX === Infinity) importMinX = 0;
        if (importMinY === Infinity) importMinY = 0;

        const offsetX = (maxX > 0 ? maxX + 120 : 100) - importMinX;
        const offsetY = (minY > 0 ? minY : 100) - importMinY;

        const timestamp = Date.now();
        const idMap = new Map<string, string>();

        const remappedNodes = result.nodes.map((n, idx) => {
          const newId = `imported-${timestamp}-${idx}`;
          idMap.set(n.id, newId);
          return {
            ...n,
            id: newId,
            position: {
              x: Math.round(n.position.x + offsetX),
              y: Math.round(n.position.y + offsetY),
            },
            data: {
              ...n.data,
              onEdit: n.type === "umlNote" ? handleOpenEditNote : handleOpenEditClass,
            },
          };
        });

        const remappedEdges = result.edges.map((e, idx) => {
          const newSource = idMap.get(e.source) || e.source;
          const newTarget = idMap.get(e.target) || e.target;
          const newEdgeId = `imported-edge-${timestamp}-${idx}`;
          return {
            ...e,
            id: newEdgeId,
            source: newSource,
            target: newTarget,
            type: e.type || "umlEdge",
          };
        });

        const mergedNodes = [...nodes, ...remappedNodes];
        const mergedEdges = [...edges, ...remappedEdges];

        setNodes(mergedNodes);
        setEdges(mergedEdges);
        broadcastCanvas(mergedNodes, mergedEdges);
        setToastMessage(`Diagrama fusionado con éxito (+${remappedNodes.length} clases agregadas)`);
      }
    } catch (err: any) {
      console.error("Error al importar imagen en lienzo:", err);
      setToastMessage(err.message || "Error al interpretar la imagen con Gemini Vision");
    } finally {
      setIsImageImporting(false);
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
          onOpenImageImport={() => setIsCanvasImageImportOpen(true)}
          onOpenPreview={() => setIsCodePreviewOpen(true)}
          onOpenSpringBootExport={() => setIsSpringBootExportOpen(true)}
          onOpenFlutterExport={() => setIsFlutterExportOpen(true)}
          onOpenMobileLink={() => setIsMobileLinkModalOpen(true)}
          isWsConnected={isWsConnected}
        />

        {/* Alerta flotante informativa (RB-01: Regla de Unicidad) */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 hover:opacity-80 p-0.5 rounded transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          style={{ width: "100%", height: "100%" }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
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

        {/* Burbuja flotante y Panel Lateral de Copilot IA (Reemplaza CanvasAiPromptBar) */}
        <CanvasCopilotBubble
          isOpen={isCopilotOpen}
          onToggle={() => {
            setIsCopilotOpen(!isCopilotOpen);
            if (!isCopilotOpen) setCopilotUnreadCount(0);
          }}
          unreadCount={copilotUnreadCount}
          isThinking={isProactiveThinking || Boolean(applyingProposalId)}
        />

        <CanvasCopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          diagramId={diagramId}
          diagramName={diagram?.nombre || "Diagrama"}
          currentUser={currentUser}
          messages={copilotMessages}
          onSendMessage={handleSendCopilotMessage}
          onAcceptProposal={handleAcceptProposal}
          onIgnoreProposal={handleIgnoreProposal}
          isLoading={isCopilotLoading}
          isProactiveThinking={isProactiveThinking}
          applyingProposalId={applyingProposalId}
          aiQuotaError={aiQuotaError}
        />

        {/* Modal para Vincular Visor Móvil Companion (Flutter por QR / Enlace) */}
        <CanvasMobileLinkModal
          isOpen={isMobileLinkModalOpen}
          onClose={() => setIsMobileLinkModalOpen(false)}
          diagramId={diagramId}
          diagramName={diagram?.nombre || "Diagrama"}
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

      {/* Modal para editar Notas */}
      <NoteEditModal
        isOpen={isNoteEditModalOpen}
        nodeId={editingNoteId}
        initialData={editingNoteData}
        onClose={() => {
          setIsNoteEditModalOpen(false);
          setEditingNoteId(null);
          setEditingNoteData(null);
        }}
        onSave={handleSaveNoteEdit}
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

      {/* Modal para Importar Imagen con Gemini Vision (Reemplazar vs Fusionar) */}
      <CanvasImageImportModal
        isOpen={isCanvasImageImportOpen}
        onClose={() => setIsCanvasImageImportOpen(false)}
        onImport={handleCanvasImageImport}
        isProcessing={isImageImporting}
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
