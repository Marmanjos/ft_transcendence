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

// --- SISTEMA DE CONQUISTAS (EMBLEMAS ESTÁTICOS) ---
interface Badge {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  iconUrl: string;
}

const STATIC_BADGES: Badge[] = [
  { id: "bronze", name: "Recruta da Arena", description: "Alcançou o Nível 4", levelRequired: 4, iconUrl: "/assets/badges/level_4.png" },
  { id: "silver", name: "Guerreiro Elemental", description: "Alcançou o Nível 8", levelRequired: 8, iconUrl: "/assets/badges/level_8.png" },
  { id: "gold", name: "Mestre dos Elementos", description: "Alcançou o Nível 12", levelRequired: 12, iconUrl: "/assets/badges/level_12.png" },
  { id: "platinum", name: "Lenda de Marte", description: "Alcançou o Nível 16", levelRequired: 16, iconUrl: "/assets/badges/level_16.png" },
  { id: "titan", name: "Titã Invicto", description: "Alcançou o Nível 20", levelRequired: 20, iconUrl: "/assets/badges/level_20.png" },
];
// --------------------------------------------------

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
    res.status(200).json({ success: false, error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(200).json({ success: false, error: "Usuário não encontrado" });
    return;
  }

  let finalAvatarUrl = user.avatarUrl ?? null;

  if (finalAvatarUrl) {
    const filename = finalAvatarUrl.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
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
    res.status(200).json({ success: false, error: params.error.message });
    return;
  }

  if (req.user!.userId !== params.data.id) {
    res.status(403).json({ error: "Não autorizado" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(200).json({ success: false, error: parsed.error.message });
    return;
  }

  if (parsed.data.username) {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, parsed.data.username))
      .limit(1);

    if (existingUser && existingUser.id !== params.data.id) {
      res.status(200).json({ success: false, error: "Este username já está em uso." });
      return;
    }
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(200).json({ success: false, error: "Usuário não encontrado" });
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
      res.status(200).json({ success: false, error: "Nenhum ficheiro enviado" });
      return;
    }

    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

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

// 5. USER STATS (Atualizado com Nível e Medalhas Dinâmicas)
router.get("/users/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = parseInt(raw, 10);
  if (isNaN(userId)) {
    res.status(200).json({ success: false, error: "ID inválido" });
    return;
  }

  const completedMatches = await db
    .select()
    .from(matchesTable)
    .where(
      sql`(${matchesTable.player1Id} = ${userId} OR ${matchesTable.player2Id} = ${userId}) AND ${matchesTable.status} = 'COMPLETED'`
    );

  let wins = 0, losses = 0, draws = 0;
  let multiplayerXP = 0;
  for (const match of completedMatches) {
    if (match.mode === "MULTIPLAYER") {
      // 3v3 matches: XP based on player1Score (which stores final score ranging -6 to +6)
      // Formula: max(0, 75 + score * 25)
      // Score +6: 225 XP | Score +3: 150 XP | Score 0: 75 XP | Score -3: 0 XP
      multiplayerXP += Math.max(0, 75 + match.player1Score * 25);

      // Still count for stats (win = higher score than opponents)
      if (match.winnerId === userId) {
        wins++;
      } else if (match.winnerId !== null) {
        losses++;
      } else {
        draws++;
      }
    } else {
      // 1v1 and AI matches
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
  }

  const totalMatches = completedMatches.length;
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;

const singleplayerMatches = completedMatches.filter(m => m.mode !== "MULTIPLAYER");
const singleplayerWins = singleplayerMatches.filter(m => m.winnerId === userId).length;
const singleplayerDraws = singleplayerMatches.filter(m => m.winnerId === null && !(m.mode === "SINGLE_PLAYER" && m.player2Score > m.player1Score)).length;

const temporaryXP = (singleplayerWins * 100) + (singleplayerDraws * 30) + multiplayerXP;
const userLevel = Math.max(1, Math.floor(temporaryXP / 1000) + 1);
const xpForCurrentLevel = (userLevel - 1) * 1000;
const xpForNextLevel = userLevel * 1000;
const currentLevelXP = temporaryXP - xpForCurrentLevel;
const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;

  // Filtragem dinâmica de conquistas com base no nível calculado
  const unlockedBadges = STATIC_BADGES.filter(badge => userLevel >= badge.levelRequired);
  // -----------------------------------------

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
    level: userLevel,
    badges: unlockedBadges,
    totalXP: temporaryXP,
    currentLevelXP,
    xpNeededForNextLevel,
  });
});

export default router;