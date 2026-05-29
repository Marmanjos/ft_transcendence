import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const query = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 10) : 10;

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .limit(100);

  const leaderboardData = await Promise.all(
    users.map(async (user) => {
      const completedMatches = await db
        .select()
        .from(matchesTable)
        .where(
          sql`(${matchesTable.player1Id} = ${user.id} OR ${matchesTable.player2Id} = ${user.id}) AND ${matchesTable.status} = 'COMPLETED'`
        );

      let wins = 0, losses = 0;
      for (const match of completedMatches) {
        if (match.winnerId === user.id) wins++;
        else if (match.winnerId !== null) losses++;
      }

      const totalMatches = completedMatches.length;
      const winRate = totalMatches > 0 ? wins / totalMatches : 0;

      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        wins,
        losses,
        totalMatches,
        winRate,
      };
    })
  );

  const sorted = leaderboardData
    .filter(u => u.totalMatches > 0)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, limit)
    .map((entry, idx) => ({ rank: idx + 1, ...entry }));

  res.json(sorted);
});

router.get("/arena/summary", async (_req, res): Promise<void> => {
  const [totalPlayersResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(usersTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [matchesTodayResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(matchesTable)
    .where(sql`${matchesTable.createdAt} >= ${today} AND ${matchesTable.status} = 'COMPLETED'`);

  const [totalMatchesResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(matchesTable)
    .where(sql`${matchesTable.status} = 'COMPLETED'`);

  const [activeMatchesResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(matchesTable)
    .where(sql`${matchesTable.status} = 'ACTIVE'`);

  res.json({
    totalPlayers: totalPlayersResult?.count ?? 0,
    matchesToday: matchesTodayResult?.count ?? 0,
    totalMatches: totalMatchesResult?.count ?? 0,
    activeMatches: activeMatchesResult?.count ?? 0,
  });
});

export default router;
