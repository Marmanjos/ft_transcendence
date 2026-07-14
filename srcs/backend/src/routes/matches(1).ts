import { Router, type IRouter } from "express";
import { db, matchesTable, roundsTable, usersTable, achievementsTable, userAchievementsTable } from "@workspace/db";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import {
  CreateMatchBody,
  GetMatchParams,
  SubmitRoundParams,
  SubmitRoundBody,
  ListMatchesQueryParams,
} from "@workspace/api-zod";
import { resolveRound, getAiChoice, type Elemental, type Outcome } from "../lib/gameEngine.js";
import { calculateMatchXp, evaluateAchievements, getLevelForXp } from "../lib/progression.js";

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
    aiDifficulty: match.aiDifficulty,
    createdAt: match.createdAt.toISOString(),
    completedAt: match.completedAt ? match.completedAt.toISOString() : null,
  };
}

/**
 * Concede XP ao usuário e desbloqueia achievements recém-alcançados após o término
 * de uma partida. Roda em "melhor esforço": qualquer erro aqui é logado mas não
 * deve quebrar a resposta da rota de submissão de round, já que a partida em si
 * já foi salva corretamente nesse ponto.
 * Retorna o que foi concedido, para o front poder exibir notificações ("+25 XP", etc).
 */
async function grantPostMatchRewards(params: {
  userId: number;
  won: boolean;
  isDraw: boolean;
  mode: "SINGLE_PLAYER" | "MULTIPLAYER";
  player1Choices: Elemental[];
  roundOutcomes: Outcome[];
}) {
  const { userId, won, isDraw, mode, player1Choices, roundOutcomes } = params;

  const xpGained = calculateMatchXp({ won, isDraw, mode, roundOutcomes });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  const newXp = user.xp + xpGained;
  const newLevel = getLevelForXp(newXp);
  const leveledUp = newLevel > user.level;

  await db
    .update(usersTable)
    .set({ xp: newXp, level: newLevel })
    .where(eq(usersTable.id, userId));

  // Totais agregados necessários para achievements baseados em contagem.
  const completedMatches = await db
    .select()
    .from(matchesTable)
    .where(
      sql`(${matchesTable.player1Id} = ${userId} OR ${matchesTable.player2Id} = ${userId}) AND ${matchesTable.status} = 'COMPLETED'`
    );

  const totalMatchesAfterMatch = completedMatches.length;
  const totalWinsAfterMatch = completedMatches.filter((m) => m.winnerId === userId).length;

  const candidateKeys = evaluateAchievements({
    userId,
    won,
    isDraw,
    totalWinsAfterMatch,
    totalMatchesAfterMatch,
    newLevel,
    player1Choices,
    roundOutcomes,
  });

  let newlyUnlocked: { key: string; name: string; description: string }[] = [];

  if (candidateKeys.length > 0) {
    const alreadyUnlocked = await db
      .select({ key: achievementsTable.key })
      .from(userAchievementsTable)
      .innerJoin(achievementsTable, eq(userAchievementsTable.achievementId, achievementsTable.id))
      .where(eq(userAchievementsTable.userId, userId));

    const alreadyUnlockedKeys = new Set(alreadyUnlocked.map((a) => a.key));
    const trulyNewKeys = candidateKeys.filter((key) => !alreadyUnlockedKeys.has(key));

    if (trulyNewKeys.length > 0) {
      const achievementRows = await db
        .select()
        .from(achievementsTable)
        .where(inArray(achievementsTable.key, trulyNewKeys));

      if (achievementRows.length > 0) {
        await db
          .insert(userAchievementsTable)
          .values(achievementRows.map((a) => ({ userId, achievementId: a.id })))
          .onConflictDoNothing();

        newlyUnlocked = achievementRows.map((a) => ({ key: a.key, name: a.name, description: a.description }));
      }
    }
  }

  return { xpGained, newXp, newLevel, leveledUp, newlyUnlocked };
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
      aiDifficulty: parsed.data.aiDifficulty ?? "MEDIUM",
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
  const previousPlayerChoices = existingRounds.map(r => r.player1Choice as Elemental);
  const player2Choice = match.mode === "SINGLE_PLAYER" 
    ? getAiChoice(match.aiDifficulty, previousPlayerChoices) 
    : player1Choice;
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
  let rewards: Awaited<ReturnType<typeof grantPostMatchRewards>> = null;

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

  // Concede XP e checa achievements somente quando a partida acabou de ser concluída
  // nesta requisição (não em toda submissão de round).
  if (newStatus === "COMPLETED") {
    const allRoundsForMatch = [...existingRounds, round];
    const player1Choices = allRoundsForMatch.map((r) => r.player1Choice as Elemental);
    const roundOutcomes = allRoundsForMatch.map((r) => r.outcome as Outcome);

    try {
      rewards = await grantPostMatchRewards({
        userId: match.player1Id,
        won: winnerId === match.player1Id,
        isDraw: winnerId === null,
        mode: match.mode as "SINGLE_PLAYER" | "MULTIPLAYER",
        player1Choices,
        roundOutcomes,
      });
    } catch (err) {
      // Best-effort: não falhar a resposta do round por causa de XP/achievements.
      console.error("Falha ao conceder recompensas pós-partida:", err);
    }
  }

  res.json({
    id: round.id,
    matchId: round.matchId,
    roundNumber: round.roundNumber,
    player1Choice: round.player1Choice,
    player2Choice: round.player2Choice,
    outcome: round.outcome,
    createdAt: round.createdAt.toISOString(),
    ...(rewards ? {
      rewards: {
        xpGained: rewards.xpGained,
        newXp: rewards.newXp,
        newLevel: rewards.newLevel,
        leveledUp: rewards.leveledUp,
        newlyUnlockedAchievements: rewards.newlyUnlocked,
      },
    } : {}),
  });
});

export default router;
