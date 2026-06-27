import { useState, useEffect, useCallback } from "react";
import { useWs, type ServerMsg } from "./use-ws";
import { useAuth } from "./use-auth";

export interface AppNotification {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export function useNotifications() {
  const { token } = useAuth();
  const { onMessage } = useWs(token);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Carregar não-lidas ao montar
  useEffect(() => {
    if (!token) return;
    fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: AppNotification[]) => setNotifications(data))
      .catch(() => {});
  }, [token]);

  // Receber em tempo real via WS
  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      if (msg.type === "NOTIFICATION") {
        setNotifications(prev => [
          { id: msg.id, type: msg.notifType, payload: msg.payload as any, createdAt: msg.createdAt },
          ...prev,
        ]);
      }
    });
    return off;
  }, [onMessage]);

  const markRead = useCallback(async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notifications/${id}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  }, [token]);

  const markAllRead = useCallback(async () => {
    setNotifications([]);
    await fetch("/api/notifications/read-all", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  }, [token]);

  return { notifications, unreadCount: notifications.length, markRead, markAllRead };
}