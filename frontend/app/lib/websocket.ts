import { WSEvent } from "./types";

export class FocusGroupWS {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private onEvent: (event: WSEvent) => void;

  constructor(sessionId: string, onEvent: (event: WSEvent) => void) {
    this.sessionId = sessionId;
    this.onEvent = onEvent;
  }

  connect() {
    // Derive ws(s)://host from the API base if it's configured, otherwise hit the local backend.
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
    const wsBase = apiBase.replace(/^http/, "ws");
    const url = `${wsBase}/session/${this.sessionId}/stream`;
    console.log("[WS] connecting to", url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[WS] connected");
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WSEvent;
        if (event.type !== "token" && event.type !== "ping") {
          console.log("[WS] event:", event.type, event.data);
        }
        this.onEvent(event);
      } catch {
        console.error("[WS] Failed to parse message", e.data);
      }
    };

    this.ws.onerror = (e) => {
      console.error("[WS] error", e);
    };

    this.ws.onclose = (e) => {
      console.log("[WS] closed", e.code, e.reason);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
