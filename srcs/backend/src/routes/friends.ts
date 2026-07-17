import { Router, type IRouter } from "express";
import { db, usersTable, friendshipsTable } from "@workspace/db";
import { eq, or, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { AddFriendBody, AcceptFriendParams, RemoveFriendParams } from "@workspace/api-zod";
import { sendToUser } from "../lib/wsServer.js";
import { createNotification } from "../lib/notifications.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// GET /friends - Get friends list and pending requests
router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.user!.userId;

  try {
    const friendships = await db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          eq(friendshipsTable.userId, currentUserId),
          eq(friendshipsTable.friendId, currentUserId)
        )
      );

    if (friendships.length === 0) {
      res.json([]);
      return;
    }

    const otherUserIds = friendships.map(f => f.userId === currentUserId ? f.friendId : f.userId);
    
    const users = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.id, otherUserIds));

    const userMap = new Map(users.map(u => [u.id, u]));

    const result = friendships.map(f => {
      const friendId = f.userId === currentUserId ? f.friendId : f.userId;
      const friend = userMap.get(friendId);
      
      let status: "PENDING" | "ACCEPTED" | "REQUEST_RECEIVED" = f.status as any;
      if (f.status === "PENDING" && f.friendId === currentUserId) {
        status = "REQUEST_RECEIVED";
      }

      let finalAvatarUrl = friend?.avatarUrl ?? null;

      // Validação em tempo real para evitar links fantasmas na lista de amigos
      if (friend && finalAvatarUrl) {
        const filename = finalAvatarUrl.replace("/uploads/", "");
        const filePath = path.join(process.cwd(), "uploads", filename);

        if (!fs.existsSync(filePath)) {
          // Limpa a DB silenciosamente em background
          db.update(usersTable)
            .set({ avatarUrl: null })
            .where(eq(usersTable.id, friend.id))
            .execute()
            .catch((err) => console.error("Erro ao limpar avatar na lista de amigos:", err));

          finalAvatarUrl = null; // Força o envio imediato de null para o frontend
        }
      }

      return {
        id: f.id,
        friend: friend ? {
          id: friend.id,
          username: friend.username,
          email: friend.email,
          avatarUrl: finalAvatarUrl,
          createdAt: friend.createdAt.toISOString(),
        } : null,
        status,
        createdAt: f.createdAt.toISOString(),
      };
    }).filter(r => r.friend !== null);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar lista de amigos" });
  }
});

// POST /friends - Send friend request or add friend
router.post("/friends", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.user!.userId;

  const parsed = AddFriendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(200).json({ success: false, error: parsed.error.message });
    return;
  }

  const { friendId, username } = parsed.data;

  try {
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .limit(1);

    if (!currentUser) {
      res.status(200).json({ success: false, error: "Usuário atual não encontrado" });
      return;
    }

    let targetUser;

    if (friendId !== undefined) {
      if (friendId === currentUserId) {
        res.status(200).json({ success: false, error: "Você não pode adicionar a si mesmo" });
        return;
      }
      [targetUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, friendId))
        .limit(1);
    } else if (username !== undefined) {
      const cleanUsername = username.trim();

      if (currentUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
        res.status(200).json({ success: false, error: "Você não pode adicionar a si mesmo" });
        return;
      }

      [targetUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, cleanUsername))
        .limit(1);
    }

    if (!targetUser) {
      res.status(200).json({ success: false, error: "Usuário não encontrado" });
      return;
    }

    const targetUserId = targetUser.id;

    // Check if friendship already exists
    const [existing] = await db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          and(eq(friendshipsTable.userId, currentUserId), eq(friendshipsTable.friendId, targetUserId)),
          and(eq(friendshipsTable.userId, targetUserId), eq(friendshipsTable.friendId, currentUserId))
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status === "ACCEPTED") {
        res.status(200).json({ success: false, error: "Vocês já são amigos" });
        return;
      }
      
      if (existing.userId === currentUserId) {
        res.status(200).json({ success: false, error: "Solicitação de amizade já enviada" });
        return;
      }

      // If the other user already sent a request, accept it automatically!
      const [updated] = await db
        .update(friendshipsTable)
        .set({ status: "ACCEPTED" })
        .where(eq(friendshipsTable.id, existing.id))
        .returning();

      await createNotification(targetUserId, "FRIEND_ACCEPTED", { fromUsername: currentUser.username });

      res.status(201).json({
        id: updated.id,
        friend: {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
          avatarUrl: targetUser.avatarUrl ?? null,
          createdAt: targetUser.createdAt.toISOString(),
        },
        status: "ACCEPTED",
        createdAt: updated.createdAt.toISOString(),
      });
      return;
    }

    const [newFriendship] = await db
      .insert(friendshipsTable)
      .values({
        userId: currentUserId,
        friendId: targetUserId,
        status: "PENDING",
      })
      .returning();

    await createNotification(targetUserId, "FRIEND_REQUEST", { fromUsername: currentUser.username });

    res.status(201).json({
      id: newFriendship.id,
      friend: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        avatarUrl: targetUser.avatarUrl ?? null,
        createdAt: targetUser.createdAt.toISOString(),
      },
      status: "PENDING",
      createdAt: newFriendship.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar amigo" });
  }
});

// POST /friends/:id/accept - Accept a friend request
router.post("/friends/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.user!.userId;

  const parsedParams = AcceptFriendParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(200).json({ success: false, error: parsedParams.error.message });
    return;
  }

  const { id } = parsedParams.data;

  try {
    const [friendship] = await db
      .select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, id))
      .limit(1);

    if (!friendship) {
      res.status(200).json({ success: false, error: "Solicitação não encontrada" });
      return;
    }

    if (friendship.friendId !== currentUserId) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    const [updated] = await db
      .update(friendshipsTable)
      .set({ status: "ACCEPTED" })
      .where(eq(friendshipsTable.id, id))
      .returning();

    const friendId = friendship.userId;
    const [friend] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, friendId))
      .limit(1);

    const [currentUser] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId))
      .limit(1);

    await createNotification(friendId, "FRIEND_ACCEPTED", { fromUsername: currentUser?.username ?? "Alguém" });

    res.json({
      id: updated.id,
      friend: friend ? {
        id: friend.id,
        username: friend.username,
        email: friend.email,
        avatarUrl: friend.avatarUrl ?? null,
        createdAt: friend.createdAt.toISOString(),
      } : null,
      status: "ACCEPTED",
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao aceitar solicitação" });
  }
});

// DELETE /friends/:id - Remove a friend or cancel/decline a request
router.delete("/friends/:id", requireAuth, async (req, res): Promise<void> => {
  const currentUserId = req.user!.userId;

  const parsedParams = RemoveFriendParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(200).json({ success: false, error: parsedParams.error.message });
    return;
  }

  const { id } = parsedParams.data;

  try {
    const [friendship] = await db
      .select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, id))
      .limit(1);

    if (!friendship) {
      res.status(200).json({ success: false, error: "Amizade não encontrada" });
      return;
    }

    if (friendship.userId !== currentUserId && friendship.friendId !== currentUserId) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    await db
      .delete(friendshipsTable)
      .where(eq(friendshipsTable.id, id));

    const targetUserId = friendship.userId === currentUserId ? friendship.friendId : friendship.userId;
    sendToUser(targetUserId, {
      type: "FRIEND_UPDATE",
      reason: "REMOVED",
    });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover amizade" });
  }
});

export default router;
