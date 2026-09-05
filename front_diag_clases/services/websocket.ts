import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WebSocketMessage } from "@/types";

export class DiagramWebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private subscribers: Map<number, (message: WebSocketMessage) => void> = new Map();
  private stompSubscriptions: Map<number, StompSubscription> = new Map();

  public connect(
    onConnected?: () => void,
    onError?: (err: any) => void
  ) {
    if (this.client && this.isConnected) {
      if (onConnected) onConnected();
      return;
    }

    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
      if (typeof window !== "undefined") {
        return `http://${window.location.hostname}:8080/ws`;
      }
      return "http://localhost:8080/ws";
    };

    const socketUrl = getWsUrl();

    this.client = new Client({
      webSocketFactory: () => new SockJS(socketUrl) as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
      onConnect: () => {
        this.isConnected = true;
        // Re-suscribir los tópicos STOMP activos tras reconexión
        this.stompSubscriptions.clear();
        this.subscribers.forEach((_, diagramId) => {
          this.subscribeStompTopic(diagramId);
        });
        if (onConnected) {
          setTimeout(() => {
            if (this.isConnected && this.client?.connected) {
              onConnected();
            }
          }, 50);
        }
      },
      onStompError: (frame) => {
        console.warn("STOMP error:", frame.headers["message"]);
        if (onError) onError(frame);
      },
      onWebSocketClose: () => {
        this.isConnected = false;
      },
    });

    this.client.activate();
  }

  private subscribeStompTopic(diagramId: number) {
    if (!this.client || !this.isConnected || !this.client.connected) return;
    if (this.stompSubscriptions.has(diagramId)) return; // Ya existe suscripción activa al tópico STOMP

    try {
      const sub = this.client.subscribe(`/topic/diagram/${diagramId}`, (msg: IMessage) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(msg.body);
          // Invocar SIEMPRE el callback más reciente registrado para este diagramId (evita closures desactualizados)
          const handler = this.subscribers.get(diagramId);
          if (handler) {
            handler(parsed);
          }
        } catch (e) {
          console.error("Error al parsear mensaje de WebSocket", e);
        }
      });

      this.stompSubscriptions.set(diagramId, sub);
    } catch (err) {
      console.warn("No se pudo suscribir al tópico STOMP:", err);
    }
  }

  public subscribeToDiagram(
    diagramId: number,
    onMessageReceived: (message: WebSocketMessage) => void
  ) {
    // Actualizar SIEMPRE la función handler más reciente en el mapa
    this.subscribers.set(diagramId, onMessageReceived);

    if (this.client && this.isConnected && this.client.connected) {
      this.subscribeStompTopic(diagramId);
    }
  }

  public sendMessage(diagramId: number, message: WebSocketMessage) {
    if (this.client && this.isConnected && this.client.connected) {
      try {
        this.client.publish({
          destination: `/app/diagram/${diagramId}/sync`,
          body: JSON.stringify(message),
        });
      } catch (err) {
        console.warn("Aviso al enviar mensaje por WebSocket:", err);
      }
    }
  }

  public disconnect() {
    if (this.client) {
      this.stompSubscriptions.forEach((sub) => sub.unsubscribe());
      this.stompSubscriptions.clear();
      this.subscribers.clear();
      this.client.deactivate();
      this.isConnected = false;
      this.client = null;
    }
  }
}

export const wsService = new DiagramWebSocketService();
