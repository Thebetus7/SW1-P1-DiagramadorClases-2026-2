export interface User {
  id: number;
  correo: string;
  nombre: string;
  token?: string;
}

export interface Collaborator {
  id: number;
  userId: number;
  nombre: string;
  correo: string;
  rol: "CREADOR" | "COLABORADOR";
  joinedAt: string;
}

export interface DiagramResponse {
  id: number;
  nombre: string;
  idCreador: number;
  nombreCreador: string;
  correoCreador: string;
  lienzo: string;
  isDeleted: boolean;
  userRole: "CREADOR" | "COLABORADOR";
  colaboradores: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

export type UmlVisibility = "+" | "-" | "#" | "~";

export interface UmlAttribute {
  id: string;
  visibility: UmlVisibility;
  name: string;
  type: string;
}

export interface UmlMethod {
  id: string;
  visibility: UmlVisibility;
  name: string;
  parameters: string;
  returnType: string;
}

export type UmlRelationType =
  | "ASSOCIATION"
  | "DIRECTED_ASSOCIATION"
  | "GENERALIZATION"
  | "REALIZATION"
  | "AGGREGATION"
  | "COMPOSITION"
  | "DEPENDENCY"
  | "ASSOCIATION_CLASS";

export interface UmlEdgeData {
  relationType: UmlRelationType;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  name?: string;
  isAssociationClass?: boolean;
  targetEdgeId?: string;
  sourceClassId?: string;
  targetClassId?: string;
  intermediateNodeId?: string;
}

export type ImportCanvasMode = "REPLACE" | "MERGE";

export interface UmlAssociationEdgeData extends UmlEdgeData {
  isAssociationClass: boolean;
  targetEdgeId: string;
  sourceClassId: string;
  targetClassId: string;
  intermediateNodeId: string;
}

export interface UmlAssociationClassConnection {
  associationEdgeId: string;
  intermediateClassId: string;
  sourceClassId?: string;
  targetClassId?: string;
}

export interface UmlClassData {
  name: string;
  stereotype?: string;
  attributes: (UmlAttribute | string)[];
  methods: (UmlMethod | string)[];
  isHighlighted?: boolean;
  isAbstract?: boolean;
}

export interface UmlNoteData {
  content: string;
}

export interface WebSocketMessage {
  type:
    | "JOIN"
    | "LEAVE"
    | "SYNC_CANVAS"
    | "NODE_CHANGE"
    | "PRESENCE"
    | "CURSOR_MOVE"
    | "NODE_MOVE"
    | "CHAT_MESSAGE"
    | "PROACTIVE_SUGGESTION"
    | "PROPOSAL_RESOLVED";
  diagramId: number;
  userId: number;
  userName: string;
  userRole: "CREADOR" | "COLABORADOR" | "SISTEMA";
  payload: string;
  timestamp?: number;
}

// ==========================================
// Extensiones Copilot IA Chat y Visor Móvil
// ==========================================

export type CopilotMode = "CHAT" | "EDITOR";

export type ChatSenderType = "USER" | "COPILOT" | "SYSTEM";

export type ChatMessageType =
  | "CHAT_MESSAGE"
  | "EDITOR_PROPOSAL"
  | "PROACTIVE_SUGGESTION"
  | "ERROR_ALERT";

export type ProposalStatus = "PENDING" | "ACCEPTED" | "IGNORED" | "EXPIRED";

export interface ChatProposalPayload {
  summary: string;
  nodesDelta?: any[];
  edgesDelta?: any[];
  status?: ProposalStatus;
  affectedNodeIds?: string[];
  sourceImageId?: string;
  mergeStrategy?: "MERGE" | "REPLACE";
  resolvedByUserId?: number | null;
  resolvedByUserName?: string | null;
  resolvedAt?: string | null;
}

export interface ChatMessage {
  id?: string;
  diagramId: number;
  senderType: ChatSenderType;
  userId?: number | null;
  userName: string;
  mode: CopilotMode;
  messageType: ChatMessageType;
  content: string;
  imageUrl?: string | null;
  attachmentThumbnail?: string | null;
  attachmentMimeType?: string | null;
  sourceImageId?: string | null;
  taggedUserName?: string | null;
  proposalJson?: string | null;
  proposal?: ChatProposalPayload | null;
  proposalStatus?: ProposalStatus;
  resolvedByUserId?: number | null;
  resolvedByUserName?: string | null;
  resolvedAt?: string | null;
  isError?: boolean;
  errorMessage?: string | null;
  createdAt?: string;
}

export interface MobileLinkPayload {
  diagramId: number;
  accessUrl: string;
  wsEndpoint: string;
  qrPayload: string;
}

// ==========================================
// Extensiones Motor Dual IA (WebLLM Local & Floating Edges)
// ==========================================

export type AiProvider = "GEMINI_CLOUD" | "WEBLLM_LOCAL";
export type LocalModelChoice = "Llama-3.2-3B-Instruct-q4f16_1-MLC" | "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export type LocalModelStatus = "NOT_DOWNLOADED" | "DOWNLOADING" | "READY" | "ERROR";

export interface AiEngineConfig {
  provider: AiProvider;
  localModelId: LocalModelChoice;
  status: LocalModelStatus;
  progressPercent: number;
  vramUsedMb?: number;
  webGpuSupported: boolean;
  errorMessage?: string;
}

export interface FloatingEdgeParams {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: string;
  targetPosition: string;
}

