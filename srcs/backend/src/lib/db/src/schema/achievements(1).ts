import { Router, type IRouter } from "express";
import { db, achievementsTable, userAchievementsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getLevelProgress } from "../lib/progression.js";

const router: IRouter = Router();

// GET /achievements - catálogo completo de conquistas existentes no jogo
router.get("/achievements", async (_req, res): Promise<void> => {
  const achievements = await db.select().from(achievementsTable);

  res.json(
    achievements.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon ?? null,
      category: a.category,
    }))
  );
});

// GET /users/:id/achievements - progresso de um usuário: o que já desbloqueou + catálogo completo
router.get("/users/:id/achievements", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const allAchievements = await db.select().from(achievementsTable);

  const unlocked = await db
    .select({
      achievementId: userAchievementsTable.achievementId,
      unlockedAt: userAchievementsTable.unlockedAt,
    })
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  res.json(
    allAchievements.map((a) => {
      const unlockedAt = unlockedMap.get(a.id) ?? null;
      return {
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon ?? null,
        category: a.category,
        unlocked: unlockedAt !== null,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      };
    })
  );
});

// GET /users/:id/progression - XP, nível atual e progresso até o próximo nível
router.get("/users/:id/progression", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const progress = getLevelProgress(user.xp);

  res.json({
    userId,
    xp: user.xp,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    percentToNextLevel: progress.percentToNextLevel,
  });
});

export default router;
