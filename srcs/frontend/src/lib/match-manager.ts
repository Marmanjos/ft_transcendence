/**
 * Match Manager: Handles 3v3 match instances with persistent state,
 * choice synchronization, and automatic timeout cleanup.
 */

export interface MatchPlayer {
  id: string;
  username: string;
  choice: string | null;
  score: number;
}

export interface Match {
  id: string; // unique match instance ID
  code: string; // room code (e.g., "ABC123")
  hostId: string;
  hostUsername: string;
  players: MatchPlayer[];
  state: "waiting" | "playing" | "finished";
  round: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number; // 5 minutes from creation/last-activity
}

const MATCH_TTL = 5 * 60 * 1000; // 5 minutes
const MATCH_PREFIX = "3v3_match_";
const CHOICES_PREFIX = "3v3_choices_";
const ACTIVE_MATCHES_KEY = "3v3_active_matches";

export const MatchManager = {
  /**
   * Create a new match instance
   */
  createMatch(code: string, hostId: string, hostUsername: string): Match {
    const now = Date.now();
    const match: Match = {
      id: `match_${code}_${now}`,
      code,
      hostId,
      hostUsername,
      players: [{ id: hostId, username: hostUsername, choice: null, score: 0 }],
      state: "waiting",
      round: 1,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + MATCH_TTL,
    };
    this.saveMatch(match);
    this.addToActiveMatches(match.id, code);
    return match;
  },

  /**
   * Get or create a match by code
   */
  getOrCreateMatch(code: string, playerId: string, playerUsername: string): Match | null {
    const match = this.getMatchByCode(code);
    if (match) {
      // Add player if not present
      if (!match.players.some((p) => p.id === playerId)) {
        match.players.push({ id: playerId, username: playerUsername, choice: null, score: 0 });
        match.updatedAt = Date.now();
        match.expiresAt = Date.now() + MATCH_TTL;
        this.saveMatch(match);
        this.broadcastMatchUpdate(match, "PLAYER_JOINED");
      }
      return match;
    }
    return null;
  },

  /**
   * Get match by code
   */
  getMatchByCode(code: string): Match | null {
    try {
      const activeMatches = this.getActiveMatches();
      const matchId = activeMatches[code];
      if (!matchId) return null;
      const raw = localStorage.getItem(`${MATCH_PREFIX}${matchId}`);
      if (!raw) return null;
      const match = JSON.parse(raw) as Match;
      // Check if expired
      if (match.expiresAt < Date.now()) {
        this.deleteMatch(match.id);
        return null;
      }
      return match;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get match by ID
   */
  getMatch(matchId: string): Match | null {
    try {
      const raw = localStorage.getItem(`${MATCH_PREFIX}${matchId}`);
      if (!raw) return null;
      const match = JSON.parse(raw) as Match;
      if (match.expiresAt < Date.now()) {
        this.deleteMatch(match.id);
        return null;
      }
      return match;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save match to localStorage
   */
  saveMatch(match: Match): void {
    try {
      localStorage.setItem(`${MATCH_PREFIX}${match.id}`, JSON.stringify(match));
    } catch (e) {}
  },

  /**
   * Submit a player's choice and broadcast update
   */
  submitChoice(matchId: string, playerId: string, choice: string): void {
    const match = this.getMatch(matchId);
    if (!match) return;

    const player = match.players.find((p) => p.id === playerId);
    if (player) {
      player.choice = choice;
      match.updatedAt = Date.now();
      match.expiresAt = Date.now() + MATCH_TTL;
      this.saveMatch(match);
      this.broadcastMatchUpdate(match, "PLAYER_SUBMIT");
    }
  },

  /**
   * Check if all players have submitted choices
   */
  allPlayersReady(match: Match): boolean {
    return match.players.length >= 3 && match.players.every((p) => p.choice !== null);
  },

  /**
   * Get round results and update scores
   */
  resolveRound(match: Match): Match {
    const choices = match.players.map((p) => p.choice).filter((c) => c !== null);
    if (choices.length !== 3) return match;

    // Compute outcomes
    const outcomes = this.getOutcomes(
      choices[0] as string,
      choices[1] as string,
      choices[2] as string
    );

    // Update scores
    match.players.forEach((p, idx) => {
      if (outcomes[idx] === "WIN") {
        p.score += 1;
      }
    });

    // Reset choices and advance round
    match.players.forEach((p) => {
      p.choice = null;
    });
    match.round += 1;
    match.updatedAt = Date.now();
    match.expiresAt = Date.now() + MATCH_TTL;
    this.saveMatch(match);
    return match;
  },

  /**
   * Finish the match
   */
  finishMatch(matchId: string): void {
    const match = this.getMatch(matchId);
    if (!match) return;
    match.state = "finished";
    this.saveMatch(match);
    this.broadcastMatchUpdate(match, "MATCH_FINISHED");
  },

  /**
   * Delete match
   */
  deleteMatch(matchId: string): void {
    try {
      localStorage.removeItem(`${MATCH_PREFIX}${matchId}`);
      localStorage.removeItem(`${CHOICES_PREFIX}${matchId}`);
      // Remove from active matches
      const active = this.getActiveMatches();
      for (const [code, id] of Object.entries(active)) {
        if (id === matchId) {
          delete active[code];
        }
      }
      localStorage.setItem(ACTIVE_MATCHES_KEY, JSON.stringify(active));
    } catch (e) {}
  },

  /**
   * Broadcast match update via BroadcastChannel
   */
  broadcastMatchUpdate(match: Match, type: string): void {
    try {
      const ch = new BroadcastChannel(`3v3_match_${match.code}`);
      ch.postMessage({ type, match });
      ch.close();
    } catch (e) {}
  },

  /**
   * Get active matches map
   */
  getActiveMatches(): Record<string, string> {
    try {
      const raw = localStorage.getItem(ACTIVE_MATCHES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  /**
   * Add match to active matches list
   */
  addToActiveMatches(matchId: string, code: string): void {
    try {
      const active = this.getActiveMatches();
      active[code] = matchId;
      localStorage.setItem(ACTIVE_MATCHES_KEY, JSON.stringify(active));
    } catch (e) {}
  },

  /**
   * Cleanup expired matches
   */
  cleanupExpiredMatches(): void {
    try {
      const active = this.getActiveMatches();
      const now = Date.now();
      for (const [code, matchId] of Object.entries(active)) {
        const raw = localStorage.getItem(`${MATCH_PREFIX}${matchId}`);
        if (!raw) {
          delete active[code];
        } else {
          const match = JSON.parse(raw) as Match;
          if (match.expiresAt < now) {
            this.deleteMatch(matchId);
            delete active[code];
          }
        }
      }
      localStorage.setItem(ACTIVE_MATCHES_KEY, JSON.stringify(active));
    } catch (e) {}
  },

  /**
   * Compute win/loss/draw outcomes for 3 players
   */
  getOutcomes(p1: string, p2: string, p3: string): ("WIN" | "LOSS" | "DRAW")[] {
    const beats = (a: string, b: string): "WIN" | "LOSS" | "DRAW" => {
      if (a === b) return "DRAW";
      if (
        (a === "TITAN" && b === "RAZOR") ||
        (a === "RAZOR" && b === "WRAITH") ||
        (a === "WRAITH" && b === "TITAN")
      ) {
        return "WIN";
      }
      return "LOSS";
    };

    return [
      beats(p1, p2) === "WIN" && beats(p1, p3) === "WIN"
        ? "WIN"
        : beats(p1, p2) === "LOSS" || beats(p1, p3) === "LOSS"
        ? "LOSS"
        : "DRAW",
      beats(p2, p1) === "WIN" && beats(p2, p3) === "WIN"
        ? "WIN"
        : beats(p2, p1) === "LOSS" || beats(p2, p3) === "LOSS"
        ? "LOSS"
        : "DRAW",
      beats(p3, p1) === "WIN" && beats(p3, p2) === "WIN"
        ? "WIN"
        : beats(p3, p1) === "LOSS" || beats(p3, p2) === "LOSS"
        ? "LOSS"
        : "DRAW",
    ];
  },
};
