import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendToUser } from "./wsServer.js";

export type NotifType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "FRIEND_REMOVED"
  | "GAME_INVITE"
  | "ORG_INVITE"
  | "ORG_MESSAGE";

export async function createNotification(
  userId: number,
  type: NotifType,
  payload: Record<string, unknown> = {}
) {
  const [notif] = await db
    .insert(notificationsTable)
    .values({ userId, type, payload })
    .returning();

  // Entrega em tempo real se o user estiver online
  sendToUser(userId, {
    type: "NOTIFICATION",
    id: notif.id,
    notifType: notif.type,
    payload: notif.payload,
    createdAt: notif.createdAt.toISOString(),
  });

  return notif;
}

export async function getUnreadNotifications(userId: number) {
  return db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)))
    .orderBy(notificationsTable.createdAt);
}

export async function markAsRead(notifId: number, userId: number) {
  return db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, userId)));
}

export async function markAllAsRead(userId: number) {
  return db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
}