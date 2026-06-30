import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth.js";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { markAsRead, markAllAsRead, getUnreadNotifications } from "../lib/notifications.js";

const router: IRouter = Router();

// GET /notifications — lista não-lidas
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const notifs = await getUnreadNotifications(userId);
    res.json(notifs.map(n => ({
      id: n.id,
      type: n.type,
      payload: n.payload,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch {
    res.status(500).json({ error: "Erro ao buscar notificações" });
  }
});

// POST /notifications/:id/read
router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await markAsRead(id, userId);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Erro ao marcar notificação" });
  }
});

// POST /notifications/read-all
router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  try {
    await markAllAsRead(userId);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Erro ao marcar notificações" });
  }
});

export default router;