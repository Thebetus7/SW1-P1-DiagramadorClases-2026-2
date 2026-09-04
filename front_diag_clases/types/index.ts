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

export interface UmlClassData {
  name: string;
  stereotype?: string;
  attributes: string[];
  methods: string[];
}

export interface UmlNoteData {
  content: string;
}

export interface WebSocketMessage {
  type: "JOIN" | "LEAVE" | "SYNC_CANVAS" | "NODE_CHANGE" | "PRESENCE" | "CURSOR_MOVE";
  diagramId: number;
  userId: number;
  userName: string;
  userRole: "CREADOR" | "COLABORADOR";
  payload: string;
  timestamp?: number;
}
