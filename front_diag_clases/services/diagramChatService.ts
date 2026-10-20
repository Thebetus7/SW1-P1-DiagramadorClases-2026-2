import { ChatMessage, ProposalStatus } from "@/types";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = window.location.port;

    if (!port || port === "80" || port === "443") {
      return process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL
        : "/api";
    }

    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }

    return `http://${host}:8080/api`;
  }

  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
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
      throw new Error(`No se pudo conectar con el servidor backend en ${getApiBaseUrl()}.`);
    }
    throw error;
  }
}

/**
 * Consulta el historial de chat completo registrado en MongoDB para un diagrama
 */
export async function fetchChatHistory(diagramId: number): Promise<ChatMessage[]> {
  const url = `${getApiBaseUrl()}/diagrams/${diagramId}/chat/messages`;
  return handleResponse<ChatMessage[]>(
    fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
  );
}

/**
 * Persiste un mensaje de chat o sugerencia proactiva en MongoDB
 */
export async function saveChatMessage(
  diagramId: number,
  message: Partial<ChatMessage>
): Promise<ChatMessage> {
  const url = `${getApiBaseUrl()}/diagrams/${diagramId}/chat/messages`;
  return handleResponse<ChatMessage>(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })
  );
}

/**
 * Resuelve una propuesta interactiva (ACCEPTED o IGNORED) de forma atómica en MongoDB
 */
export async function resolveProposal(
  diagramId: number,
  messageId: string,
  status: ProposalStatus,
  userId?: number | null,
  userName?: string | null
): Promise<ChatMessage> {
  const url = `${getApiBaseUrl()}/diagrams/${diagramId}/chat/proposals/${messageId}/resolve`;
  return handleResponse<ChatMessage>(
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        resolvedByUserId: userId || null,
        resolvedByUserName: userName || "Usuario",
      }),
    })
  );
}
