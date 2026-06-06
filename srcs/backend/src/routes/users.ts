import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable, roundsTable } from "@workspace/db";
import { eq, or, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { GetUserParams, UpdateUserParams, UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

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

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

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
    if (match.winnerId === null) {
      draws++;
    } else if (match.winnerId === userId) {
      wins++;
    } else {
      losses++;
    }
  }

  const totalMatches = completedMatches.length;
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;

  // Compute favorite elemental from rounds
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
