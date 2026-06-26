import { useEffect, useRef, useCallback, useState } from "react";

export type ServerMsg =
  | { type: "QUEUE_JOINED" }
  | { type: "MATCH_FOUND"; matchId: number; opponentUsername: string; yourSide: "player1" | "player2" }
  | { type: "WAITING_FOR_OPPONENT" }
  | { type: "ROUND_RESULT"; roundNumber: number; player1Choice: string; player2Choice: string; yourOutcome: "WIN" | "LOSS" | "DRAW"; player1Score: number; player2Score: number }
  | { type: "MATCH_OVER"; winnerId: number | null; player1Score: number; player2Score: number }
  | { type: "REMATCH_OFFERED" }
  | { type: "REMATCH_WAITING" }
  | { type: "OPPONENT_DISCONNECTED" }
  | { type: "ROOM_CREATED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_JOINED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_UPDATED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_CHAT"; code: string; id: string; senderId: number; senderUsername: string; text: string; createdAt: string }
  | { type: "ROOM_PLAYER_LEFT"; code: string; username: string }
  | { type: "ROOM_CLOSED"; code: string; reason: "host_left" | "closed" }
  | { type: "ROOM_FULL"; code: string }
  | { type: "ROOM_NOT_FOUND"; code: string }
  | { type: "GAME_INVITE_RECEIVED"; fromUsername: string; roomCode: string }
  | { type: "FRIEND_UPDATE"; reason: "REQUEST_RECEIVED" | "REQUEST_ACCEPTED" | "REMOVED"; fromUsername?: string }
  | { type: "OPPONENT_TEMPORARILY_DISCONNECTED" }
  | { type: "OPPONENT_RECONNECTED" }
  | { type: "ORG_MESSAGE"; organizationId: number; id: number; senderId: number; senderUsername: string; text: string; createdAt: string }
  | { type: "ORG_INVITE_RECEIVED"; organizationId: number }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };

export type ClientMsg =
  | { type: "JOIN_QUEUE" }
  | { type: "LEAVE_QUEUE" }
  | { type: "SUBMIT_CHOICE"; matchId: number; elemental: string }
  | { type: "OFFER_REMATCH"; matchId: number }
  | { type: "CREATE_ROOM" }
  | { type: "JOIN_ROOM"; code: string }
  | { type: "LEAVE_ROOM" }
  | { type: "SEND_ROOM_CHAT"; text: string }
  | { type: "INVITE_TO_PLAY"; targetUserId: number }
  | { type: "PING" };

type MsgHandler = (msg: ServerMsg) => void;

function createWsUrl(token: string) {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  const baseUrl = apiBase ? new URL(apiBase) : new URL(window.location.origin);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = "/api/ws";
  baseUrl.search = `token=${encodeURIComponent(token)}`;
  baseUrl.hash = "";
  return baseUrl.toString();
}

export function useWs(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MsgHandler>>(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return undefined;

    const url = createWsUrl(token);
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
    let ws: WebSocket | null = null;
    let isCleanup = false;

    function connect() {
      if (isCleanup) return;

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!isCleanup) {
          reconnectTimeoutId = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as ServerMsg;
          handlersRef.current.forEach((h) => h(msg));
        } catch {
          // ignore malformed
        }
      };
    }

    connect();

    const pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);

    return () => {
      isCleanup = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (ws) ws.close();
    };
  }, [token]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const onMessage = useCallback((handler: MsgHandler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  return { send, onMessage, connected };
}
