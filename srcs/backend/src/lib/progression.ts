import type { Elemental, Outcome } from "./gameEngine.js";

// ============================================================
// PROGRESSÃO (XP / NÍVEL)
// ============================================================

// Tabela fixa de thresholds: XP TOTAL acumulado necessário para alcançar cada nível.
// Índice 0 = nível 1 (sempre 0xp), índice 1 = nível 2, etc.
// Para adicionar mais níveis, basta acrescentar valores ao final.
export const LEVEL_THRESHOLDS: number[] = [
  0,     // nível 1
  100,   // nível 2
  300,   // nível 3
  600,   // nível 4
  1000,  // nível 5
  1500,  // nível 6
  2200,  // nível 7
  3000,  // nível 8
  4000,  // nível 9
  5500,  // nível 10
];

/** Retorna o nível correspondente a um total de XP acumulado. */
export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/** XP necessário para alcançar o próximo nível, ou null se já está no nível máximo da tabela. */
export function getXpForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[currentLevel]; // currentLevel é 1-indexed, então thresholds[currentLevel] = próximo nível
}

/** Progresso dentro do nível atual: xp atual no nível, xp necessário para o próximo, e percentual (0-100). */
export function getLevelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  percentToNextLevel: number | null;
} {
  const level = getLevelForXp(xp);
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXp = getXpForNextLevel(level);
  const xpIntoLevel = xp - currentLevelXp;

  if (nextLevelXp === null) {
    return { level, currentLevelXp, xpIntoLevel, xpForNextLevel: null, percentToNextLevel: null };
  }

  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const percentToNextLevel = Math.min(100, Math.round((xpIntoLevel / xpNeededForLevel) * 100));

  return { level, currentLevelXp, xpIntoLevel, xpForNextLevel: nextLevelXp, percentToNextLevel };
}

export interface MatchXpInput {
  won: boolean;
  isDraw: boolean;
  mode: "SINGLE_PLAYER" | "MULTIPLAYER";
  roundOutcomes: Outcome[]; // outcomes de cada round, da perspectiva do player1
}

/**
 * Calcula o XP ganho por uma partida concluída.
 * Regras:
 *  - Participar já dá XP base (incentiva jogar mesmo perdendo)
 *  - Vitória dá bônus relevante
 *  - Multiplayer dá mais XP que contra IA (mais difícil/social)
 *  - Vitória "flawless" (sem perder nenhum round) dá bônus extra
 */
export function calculateMatchXp(input: MatchXpInput): number {
  const BASE_XP = 10;
  const WIN_BONUS = 25;
  const MULTIPLAYER_BONUS = 15;
  const FLAWLESS_BONUS = 20;

  let xp = BASE_XP;

  if (input.won) {
    xp += WIN_BONUS;

    const lostAnyRound = input.roundOutcomes.some((o) => o === "LOSS");
    if (!lostAnyRound) {
      xp += FLAWLESS_BONUS;
    }
  }

  if (input.mode === "MULTIPLAYER") {
    xp += MULTIPLAYER_BONUS;
  }

  return xp;
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

export type AchievementCategory = "GENERAL" | "COMBAT" | "PROGRESSION";

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon?: string;
}

// Catálogo estático de todas as conquistas do jogo.
// "key" é o identificador estável gravado no banco (achievementsTable.key).
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // --- Baseados em contagem ---
  {
    key: "FIRST_WIN",
    name: "Primeira Vitória",
    description: "Vença sua primeira partida.",
    category: "COMBAT",
    icon: "trophy",
  },
  {
    key: "WINS_10",
    name: "Veterano",
    description: "Vença 10 partidas.",
    category: "COMBAT",
    icon: "medal",
  },
  {
    key: "WINS_50",
    name: "Lenda da Arena",
    description: "Vença 50 partidas.",
    category: "COMBAT",
    icon: "crown",
  },
  {
    key: "MATCHES_50",
    name: "Combatente Dedicado",
    description: "Complete 50 partidas, vencendo ou perdendo.",
    category: "GENERAL",
    icon: "swords",
  },
  // --- Baseados em comportamento ---
  {
    key: "FLAWLESS_VICTORY",
    name: "Vitória Impecável",
    description: "Vença uma partida sem perder nenhum round.",
    category: "COMBAT",
    icon: "shield-check",
  },
  {
    key: "ONE_TRICK",
    name: "Especialista",
    description: "Vença uma partida usando o mesmo elemental em todos os rounds.",
    category: "COMBAT",
    icon: "target",
  },
  {
    key: "COMEBACK_KING",
    name: "Virada Épica",
    description: "Vença uma partida depois de perder o primeiro round.",
    category: "COMBAT",
    icon: "flame",
  },
  // --- Baseados em progressão ---
  {
    key: "LEVEL_5",
    name: "Em Ascensão",
    description: "Alcance o nível 5.",
    category: "PROGRESSION",
    icon: "trending-up",
  },
  {
    key: "LEVEL_10",
    name: "Mestre Elemental",
    description: "Alcance o nível 10.",
    category: "PROGRESSION",
    icon: "star",
  },
];

export interface AchievementCheckContext {
  userId: number;
  won: boolean;
  isDraw: boolean;
  totalWinsAfterMatch: number;
  totalMatchesAfterMatch: number;
  newLevel: number;
  player1Choices: Elemental[]; // escolhas do usuário avaliado, em ordem
  roundOutcomes: Outcome[]; // outcomes de cada round, da perspectiva do usuário avaliado
}

/**
 * Avalia o catálogo de achievements contra o resultado de uma partida e o estado
 * agregado do usuário (totais já incluindo essa partida), retornando as "keys"
 * de achievements que deveriam estar desbloqueadas.
 * Não checa o que já está desbloqueado no banco — isso é responsabilidade do
 * chamador (ver routes/matches.ts), que deve ignorar keys já existentes.
 */
export function evaluateAchievements(ctx: AchievementCheckContext): string[] {
  const unlocked: string[] = [];

  if (ctx.won && ctx.totalWinsAfterMatch >= 1) unlocked.push("FIRST_WIN");
  if (ctx.totalWinsAfterMatch >= 10) unlocked.push("WINS_10");
  if (ctx.totalWinsAfterMatch >= 50) unlocked.push("WINS_50");
  if (ctx.totalMatchesAfterMatch >= 50) unlocked.push("MATCHES_50");

  if (ctx.won) {
    const lostAnyRound = ctx.roundOutcomes.some((o) => o === "LOSS");
    if (!lostAnyRound) {
      unlocked.push("FLAWLESS_VICTORY");
    }

    const uniqueChoices = new Set(ctx.player1Choices);
    if (uniqueChoices.size === 1 && ctx.player1Choices.length > 0) {
      unlocked.push("ONE_TRICK");
    }

    if (ctx.roundOutcomes[0] === "LOSS") {
      unlocked.push("COMEBACK_KING");
    }
  }

  if (ctx.newLevel >= 5) unlocked.push("LEVEL_5");
  if (ctx.newLevel >= 10) unlocked.push("LEVEL_10");

  return unlocked;
}
