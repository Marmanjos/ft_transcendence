import { Router, type IRouter } from "express";
import { db, matchesTable, roundsTable, usersTable } from "@workspace/db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import {
  CreateMatchBody,
  GetMatchParams,
  SubmitRoundParams,
  SubmitRoundBody,
  ListMatchesQueryParams,
} from "@workspace/api-zod";
import { resolveRound, getAiChoice, type Elemental } from "../lib/gameEngine.js";

const router: IRouter = Router();

function formatMatch(match: typeof matchesTable.$inferSelect, p1Username?: string | null, p2Username?: string | null) {
  return {
    id: match.id,
    player1Id: match.player1Id,
    player2Id: match.player2Id ?? null,
    player1Username: p1Username ?? null,
    player2Username: p2Username ?? null,
    mode: match.mode,
    status: match.status,
    winnerId: match.winnerId ?? null,
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    createdAt: match.createdAt.toISOString(),
    completedAt: match.completedAt ? match.completedAt.toISOString() : null,
  };
}

router.get("/matches", requireAuth, async (req, res): Promise<void> => {
  const query = ListMatchesQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = query.success ? (query.data.offset ?? 0) : 0;
  const userId = req.user!.userId;

  const matches = await db
    .select()
    .from(matchesTable)
    .where(
      or(
        eq(matchesTable.player1Id, userId),
        eq(matchesTable.player2Id, userId)
      )
    )
    .orderBy(desc(matchesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set(matches.flatMap(m => [m.player1Id, m.player2Id].filter(Boolean) as number[]))];
  let usernameMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(ARRAY[${sql.raw(userIds.join(","))}]::int[])`);
    usernameMap = Object.fromEntries(users.map(u => [u.id, u.username]));
  }

  res.json(matches.map(m => formatMatch(m, usernameMap[m.player1Id], m.player2Id ? usernameMap[m.player2Id] : null)));
});

router.post("/matches", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  const [match] = await db
    .insert(matchesTable)
    .values({
      player1Id: req.user!.userId,
      mode: parsed.data.mode,
      status: "ACTIVE",
      player1Score: 0,
      player2Score: 0,
    })
    .returning();

  res.status(201).json(formatMatch(match, user?.username ?? null, null));
});

router.get("/matches/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [match] = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.id, params.data.id))
    .limit(1);

  if (!match) {
    res.status(404).json({ error: "Partida não encontrada" });
    return;
  }

  const rounds = await db
    .select()
    .from(roundsTable)
    .where(eq(roundsTable.matchId, match.id))
    .orderBy(roundsTable.roundNumber);

  const userIds = [match.player1Id, match.player2Id].filter(Boolean) as number[];
  let usernameMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(ARRAY[${sql.raw(userIds.join(","))}]::int[])`);
    usernameMap = Object.fromEntries(users.map(u => [u.id, u.username]));
  }

  res.json({
    ...formatMatch(match, usernameMap[match.player1Id], match.player2Id ? usernameMap[match.player2Id] : null),
    rounds: rounds.map(r => ({
      id: r.id,
      matchId: r.matchId,
      roundNumber: r.roundNumber,
      player1Choice: r.player1Choice,
      player2Choice: r.player2Choice,
      outcome: r.outcome,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.post("/matches/:id/rounds", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitRoundParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitRoundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [match] = await db
    .select()
    .from(matchesTable)
    .where(and(eq(matchesTable.id, params.data.id), eq(matchesTable.player1Id, req.user!.userId)))
    .limit(1);

  if (!match) {
    res.status(404).json({ error: "Partida não encontrada" });
    return;
  }

  if (match.status !== "ACTIVE") {
    res.status(400).json({ error: "Partida já finalizada" });
    return;
  }

  const existingRounds = await db
    .select()
    .from(roundsTable)
    .where(eq(roundsTable.matchId, match.id));

  const roundNumber = existingRounds.length + 1;
  if (roundNumber > 3) {
    res.status(400).json({ error: "Partida já completou todas as rodadas" });
    return;
  }

  const player1Choice = parsed.data.elemental as Elemental;
  const player2Choice = match.mode === "SINGLE_PLAYER" ? getAiChoice() : player1Choice;
  const outcome = resolveRound(player1Choice, player2Choice);

  const [round] = await db
    .insert(roundsTable)
    .values({
      matchId: match.id,
      roundNumber,
      player1Choice,
      player2Choice,
      outcome,
    })
    .returning();

  // Update scores
  let newPlayer1Score = match.player1Score;
  let newPlayer2Score = match.player2Score;
  if (outcome === "WIN") newPlayer1Score++;
  else if (outcome === "LOSS") newPlayer2Score++;

  // Check if match is completed (best of 3: first to 2 wins)
  let newStatus = match.status;
  let winnerId: number | null = match.winnerId ?? null;
  let completedAt: Date | null = match.completedAt ?? null;

  if (newPlayer1Score >= 2 || newPlayer2Score >= 2 || roundNumber >= 3) {
    newStatus = "COMPLETED";
    completedAt = new Date();
    if (newPlayer1Score > newPlayer2Score) {
      winnerId = match.player1Id;
    } else if (newPlayer2Score > newPlayer1Score) {
      winnerId = match.player2Id ?? null;
    } else {
      winnerId = null; // draw
    }
  }

  await db
    .update(matchesTable)
    .set({
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      status: newStatus,
      winnerId,
      completedAt,
    })
    .where(eq(matchesTable.id, match.id));

  res.json({
    id: round.id,
    matchId: round.matchId,
    roundNumber: round.roundNumber,
    player1Choice: round.player1Choice,
    player2Choice: round.player2Choice,
    outcome: round.outcome,
    createdAt: round.createdAt.toISOString(),
  });
});

export default router;
