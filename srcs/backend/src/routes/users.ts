import { getOnlineUserIds } from "../lib/wsServer.js";
import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable, roundsTable } from "@workspace/db";
import { eq, or, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { GetUserParams, UpdateUserParams, UpdateUserBody } from "@workspace/api-zod";
import { upload } from "../lib/upload.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

// 1. ONLINE STATUS
router.get("/users/online-status", requireAuth, async (req, res): Promise<void> => {
  const raw = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = raw.split(",").map(Number).filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    res.json({ online: [] });
    return;
  }

  res.json({ online: getOnlineUserIds(ids) });
});

// 2. GET USER PROFILE (Apenas uma definição, corrigida e com suporte a Docker)
router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  let finalAvatarUrl = user.avatarUrl ?? null;

  // Garante a existência física do ficheiro no disco do Container
  if (finalAvatarUrl) {
    const filename = finalAvatarUrl.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
      // Correção imediata em background para limpar a DB de forma assíncrona
      db.update(usersTable)
        .set({ avatarUrl: null })
        .where(eq(usersTable.id, user.id))
        .execute()
        .catch((err) => console.error("Erro ao limpar avatarUrl fantasma:", err));

      finalAvatarUrl = null; 
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: finalAvatarUrl,
    createdAt: user.createdAt.toISOString(),
  });
});

// 3. UPDATE USER PROFILE
router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (req.user!.userId !== params.data.id) {
    res.status(403).json({ error: "Não autorizado" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

// 4. UPLOAD AVATAR
router.post("/users/me/avatar", requireAuth, upload.single("avatar"), async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ error: "Nenhum ficheiro enviado" });
      return;
    }

    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    // Apaga de forma resiliente usando o caminho de trabalho atual do Docker
    if (currentUser && currentUser.avatarUrl) {
      const oldFilename = currentUser.avatarUrl.replace("/uploads/", "");
      const oldFilePath = path.join(process.cwd(), "uploads", oldFilename);

      fs.unlink(oldFilePath, (err) => {
        if (err) console.error(`Aviso ao apagar ficheiro antigo: ${err.message}`);
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const [user] = await db
      .update(usersTable)
      .set({ avatarUrl })
      .where(eq(usersTable.id, userId))
      .returning();

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    });
  }
);

// 5. USER STATS
router.get("/users/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const completedMatches = await db
    .select()
    .from(matchesTable)
    .where(
      sql`(${matchesTable.player1Id} = ${userId} OR ${matchesTable.player2Id} = ${userId}) AND ${matchesTable.status} = 'COMPLETED'`
    );

  let wins = 0, losses = 0, draws = 0;
  for (const match of completedMatches) {
    if (match.winnerId === userId) {
      wins++;
    } else if (match.winnerId !== null) {
      losses++;
    } else {
      if (match.mode === "SINGLE_PLAYER" && match.player2Score > match.player1Score) {
        losses++;
      } else {
        draws++;
      }
    }
  }

  const totalMatches = completedMatches.length;
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;

  const rounds = await db
    .select({ player1Choice: roundsTable.player1Choice, matchId: roundsTable.matchId })
    .from(roundsTable)
    .innerJoin(matchesTable, eq(roundsTable.matchId, matchesTable.id))
    .where(eq(matchesTable.player1Id, userId));

  const elementalCounts: Record<string, number> = {};
  for (const round of rounds) {
    elementalCounts[round.player1Choice] = (elementalCounts[round.player1Choice] ?? 0) + 1;
  }

  let favoriteElemental: string | null = null;
  let maxCount = 0;
  for (const [el, cnt] of Object.entries(elementalCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      favoriteElemental = el;
    }
  }

  res.json({
    userId,
    wins,
    losses,
    draws,
    totalMatches,
    winRate,
    favoriteElemental,
  });
});

export default router;
