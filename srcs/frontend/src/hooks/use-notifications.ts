import { useState, useEffect, useCallback, useRef } from "react";
import { useWs, type ServerMsg } from "./use-ws";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

export interface AppNotification {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const TOAST_TITLE: Record<string, string> = {
  FRIEND_REQUEST:  "Solicitação de Amizade! 🤝",
  FRIEND_ACCEPTED: "Pedido Aceito! 🎉",
  FRIEND_REMOVED:  "Amigo removido",
};

const TOAST_DESC = (type: string, fromUsername?: string): string => {
  const name = fromUsername || "Alguém";
  if (type === "FRIEND_REQUEST")  return `${name} enviou-te um pedido de amizade.`;
  if (type === "FRIEND_ACCEPTED") return `Agora você e ${name} são amigos.`;
  if (type === "FRIEND_REMOVED")  return `${name} te removeu dos amigos.`;
  return "";
};

export function useNotifications() {
  const { token } = useAuth();
  const { onMessage } = useWs(token);
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const loaded = useRef(false); // Fix 2: só carrega uma vez por sessão

  useEffect(() => {
    if (!token || loaded.current) return;
    loaded.current = true;
    fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: AppNotification[]) => setNotifications(data))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      if (msg.type !== "NOTIFICATION") return;

      setNotifications(prev => {
        if (prev.some(n => n.id === msg.id)) return prev; // Fix 1: deduplicar
        return [
          { id: msg.id, type: msg.notifType, payload: msg.payload as Record<string, unknown>, createdAt: msg.createdAt },
          ...prev,
        ];
      });

      const fromUsername = (msg.payload as any)?.fromUsername as string | undefined;
      const title = TOAST_TITLE[msg.notifType];
      const description = TOAST_DESC(msg.notifType, fromUsername);
      if (title) {
        toast({ title, description });
      }
    });
    return off;
  }, [onMessage, toast]);

  const markRead = useCallback(async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [token]);

  const markAllRead = useCallback(async () => {
    setNotifications([]);
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [token]);

  return { notifications, unreadCount: notifications.length, markRead, markAllRead };
}