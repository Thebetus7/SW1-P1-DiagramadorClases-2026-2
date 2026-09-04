import { User, DiagramResponse, Collaborator } from "@/types";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return `http://${host}:8080/api`;
  }
  return "http://localhost:8080/api";
}

async function handleResponse<T>(resPromise: Promise<Response>): Promise<T> {
  try {
    const res = await resPromise;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error en el servidor (${res.status})`);
    }
    return await res.json();
  } catch (error: any) {
    if (error.name === "TypeError" || error.message?.includes("fetch")) {
      throw new Error(`No se pudo conectar con el servidor backend en ${getApiBaseUrl()}. Por favor verifica que el backend esté ejecutándose.`);
    }
    throw error;
  }
}

export const api = {
  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${getApiBaseUrl()}/auth/quick-users`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Autenticación
  async login(correo: string, password: string): Promise<User> {
    return handleResponse<User>(
      fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      })
    );
  },

  async register(correo: string, nombre: string, password: string): Promise<User> {
    return handleResponse<User>(
      fetch(`${getApiBaseUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, nombre, password }),
      })
    );
  },

  async getQuickUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/quick-users`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  // Diagramas
  async getDiagrams(userId?: number): Promise<DiagramResponse[]> {
    const url = userId ? `${getApiBaseUrl()}/diagrams?userId=${userId}` : `${getApiBaseUrl()}/diagrams`;
    return handleResponse<DiagramResponse[]>(fetch(url, { cache: "no-store" }));
  },

  async getDiagramById(id: number, userId?: number): Promise<DiagramResponse> {
    const url = userId ? `${getApiBaseUrl()}/diagrams/${id}?userId=${userId}` : `${getApiBaseUrl()}/diagrams/${id}`;
    return handleResponse<DiagramResponse>(fetch(url, { cache: "no-store" }));
  },

  async createDiagram(nombre: string, idCreador: number, lienzo?: string): Promise<DiagramResponse> {
    return handleResponse<DiagramResponse>(
      fetch(`${getApiBaseUrl()}/diagrams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, idCreador, lienzo }),
      })
    );
  },

  async updateDiagram(id: number, payload: { nombre?: string; lienzo?: string; usuarioId?: number }): Promise<DiagramResponse> {
    return handleResponse<DiagramResponse>(
      fetch(`${getApiBaseUrl()}/diagrams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
  },

  async deleteDiagram(id: number, userId?: number): Promise<void> {
    const url = userId ? `${getApiBaseUrl()}/diagrams/${id}?userId=${userId}` : `${getApiBaseUrl()}/diagrams/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Error al eliminar el diagrama.");
    }
  },

  async inviteCollaborator(diagramId: number, correo: string, idSolicitante: number): Promise<Collaborator> {
    return handleResponse<Collaborator>(
      fetch(`${getApiBaseUrl()}/diagrams/${diagramId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, idSolicitante }),
      })
    );
  },

  async removeCollaborator(diagramId: number, userId: number, requesterId?: number): Promise<void> {
    const url = requesterId
      ? `${getApiBaseUrl()}/diagrams/${diagramId}/collaborators/${userId}?requesterId=${requesterId}`
      : `${getApiBaseUrl()}/diagrams/${diagramId}/collaborators/${userId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Error al retirar colaborador");
    }
  },
};
