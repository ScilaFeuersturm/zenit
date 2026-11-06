import { useEffect, useRef } from "react";
import { getWsUrl } from "@/services/api";
import { tokenStorage } from "@/services/storage";

type SocketEvent =
  | { event: "chat_message"; data: { conversation_id: number; sender_id: number; content: string; id: number; created_at: string } }
  | { event: "notification"; data: { id: number; type: string; title: string; body: string | null; related_id: number | null; created_at: string } };

/**
 * Conecta al canal único de WebSocket (/ws) y reconecta automáticamente
 * con backoff simple si se corta (red inestable, backend reiniciando, etc).
 * No dependemos de FCM: mientras la app esté abierta y con conexión, los
 * eventos de chat/notificaciones llegan en vivo por este socket.
 */
export function useZenitSocket(onMessage: (msg: SocketEvent) => void, enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let retryDelay = 1000;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function connect() {
      const token = await tokenStorage.getAccessToken();
      if (!token || cancelled) return;

      const ws = new WebSocket(`${getWsUrl()}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryDelay = 1000;
      };
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current(parsed);
        } catch {
          // mensaje no JSON, se ignora
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        retryTimeout = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, [enabled]);
}
