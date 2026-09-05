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
  | "DEPENDENCY";

export interface UmlEdgeData {
  relationType: UmlRelationType;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  name?: string;
}

export interface UmlClassData {
  name: string;
  stereotype?: string;
  attributes: (UmlAttribute | string)[];
  methods: (UmlMethod | string)[];
}

export interface UmlNoteData {
  content: string;
}

export interface WebSocketMessage {
  type: "JOIN" | "LEAVE" | "SYNC_CANVAS" | "NODE_CHANGE" | "PRESENCE" | "CURSOR_MOVE" | "NODE_MOVE";
  diagramId: number;
  userId: number;
  userName: string;
  userRole: "CREADOR" | "COLABORADOR";
  payload: string;
  timestamp?: number;
}

