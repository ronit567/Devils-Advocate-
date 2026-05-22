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
    const url = `ws://localhost:8000/session/${this.sessionId}/stream`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WSEvent;
        this.onEvent(event);
      } catch {
        console.error("Failed to parse WS message", e.data);
      }
    };

    this.ws.onerror = (e) => {
      console.error("WebSocket error", e);
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
