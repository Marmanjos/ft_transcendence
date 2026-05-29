export type ArenaType = "neon-nexus" | "cyber-ring";

export type ArenaGameState =
  | "SELECTING"
  | "COUNTDOWN"
  | "CLASH"
  | "ROUND_RESULT"
  | "MATCH_OVER";

export type ElementalType = "TITAN" | "RAZOR" | "WRAITH";

export interface ArenaSceneProps {
  gameState?: ArenaGameState;
  playerElemental?: string | null;
  aiElemental?: string | null;
  roundOutcome?: "WIN" | "LOSS" | "DRAW" | null;
  isPlayerWinner?: boolean;
}
