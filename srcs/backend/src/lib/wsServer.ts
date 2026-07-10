import { WebSocketServer, WebSocket } from "ws";
import { type IncomingMessage } from "http";
import { type Server } from "http";
import { db, matchesTable, roundsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "./auth.js";
import { resolveRound, type Elemental } from "./gameEngine.js";
import { logger } from "./logger.js";
import { getUnreadNotifications } from "./notifications.js";

type ServerMsg =
  | { type: "QUEUE_JOINED" }
  | { type: "MATCH_FOUND"; matchId: number; opponentUsername: string; yourSide: "player1" | "player2" }
  | { type: "WAITING_FOR_OPPONENT" }
  | { type: "ROUND_RESULT"; roundNumber: number; player1Choice: Elemental; player2Choice: Elemental; yourOutcome: "WIN" | "LOSS" | "DRAW"; player1Score: number; player2Score: number }
  | { type: "MATCH_OVER"; winnerId: number | null; player1Score: number; player2Score: number }
  | { type: "REMATCH_OFFERED" }
  | { type: "REMATCH_WAITING" }
  | { type: "OPPONENT_DISCONNECTED" }
  | { type: "ROOM_CREATED"; code: string; hostUsername: string; guestUsername: string | null; guestUsernames?: string[]; canChat: boolean; matchId: number | null }
  | { type: "ROOM_JOINED"; code: string; hostUsername: string; guestUsername: string | null; guestUsernames?: string[]; canChat: boolean; matchId: number | null }
  | { type: "ROOM_UPDATED"; code: string; hostUsername: string; guestUsername: string | null; guestUsernames?: string[]; canChat: boolean; matchId: number | null }
  | { type: "ROOM_CHAT"; code: string; id: string; senderId: number; senderUsername: string; text: string; createdAt: string }
  | { type: "ROOM_PLAYER_LEFT"; code: string; username: string }
  | { type: "ROOM_CLOSED"; code: string; reason: "host_left" | "closed" }
  | { type: "ROOM_FULL"; code: string }
  | { type: "ROOM_NOT_FOUND"; code: string }
  | { type: "GAME_INVITE_RECEIVED"; fromUsername: string; roomCode: string }
  | { type: "FRIEND_UPDATE"; reason: "REQUEST_RECEIVED" | "REQUEST_ACCEPTED" | "REMOVED"; fromUsername?: string }
  | { type: "OPPONENT_TEMPORARILY_DISCONNECTED" }
  | { type: "OPPONENT_RECONNECTED" }
  | { type: "ORG_MESSAGE"; organizationId: number; id: number; senderId: number; senderUsername: string; text: string; createdAt: string }
  | { type: "ERROR"; message: string }
  | { type: "PONG" }
  | { type: "NOTIFICATION"; id: number; notifType: string; payload: unknown; createdAt: string }
  | { type: "ORG_INVITE_RECEIVED"; organizationId: number; organizationName: string };

type ClientMsg =
  | { type: "JOIN_QUEUE" }
  | { type: "LEAVE_QUEUE" }
  | { type: "SUBMIT_CHOICE"; matchId: number; elemental: Elemental }
  | { type: "OFFER_REMATCH"; matchId: number }
  | { type: "CREATE_ROOM"; mode?: "1v1" | "3v3" }
  | { type: "JOIN_ROOM"; code: string }
  | { type: "LEAVE_ROOM" }
  | { type: "SEND_ROOM_CHAT"; text: string }
  | { type: "INVITE_TO_PLAY"; targetUserId: number }
  | { type: "PING" }
  | { type: "SYNC_MATCH"; matchId: number }
  | { type: "ABANDON_MATCH"; matchId: number };

interface ConnectedPlayer {
  ws: WebSocket;
  userId: number;
  username: string;
}

interface Room {
  matchId: number;
  player1: ConnectedPlayer;
  player2: ConnectedPlayer;
  roundNumber: number;
  choices: { player1?: Elemental; player2?: Elemental };
  player1Score: number;
  player2Score: number;
}

interface PartyRoomMessage {
  id: string;
  senderId: number;
  senderUsername: string;
  text: string;
  createdAt: string;
}

interface PartyRoom {
  code: string;
  host: ConnectedPlayer;
  guests: ConnectedPlayer[];
  mode: "1v1" | "3v3";
  matchId: number | null;
  messages: PartyRoomMessage[];
}

interface Room3v3 {
  matchId: number;
  code: string;
  players: ConnectedPlayer[];
  roundNumber: number;
  choices: Record<number, Elemental | null>;
  scores: Record<number, number>;
}

let waitingPlayer: ConnectedPlayer | null = null;
const rooms = new Map<number, Room>();
const partyRooms = new Map<string, PartyRoom>();
const rooms3v3 = new Map<number, Room3v3>();
const playerPartyRoom = new Map<number, string>();
// rematchOffers: matchId → set of userIds that offered rematch
const rematchOffers = new Map<number, { player1: ConnectedPlayer; player2: ConnectedPlayer; offered: Set<number> }>();

// Tracking active sockets and grace period disconnect timeouts.
const userSockets = new Map<number, Set<WebSocket>>();
const disconnectTimeouts = new Map<number, NodeJS.Timeout>();

function clearDisconnectGrace(userId: number) {
  const timeout = disconnectTimeouts.get(userId);
  if (!timeout) return;

  clearTimeout(timeout);
  disconnectTimeouts.delete(userId);
}

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function sendToUser(userId: number, msg: ServerMsg) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(msg);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastToUsers(userIds: number[], msg: ServerMsg) {
  if (userIds.length === 0) return;
  const payload = JSON.stringify(msg);
  for (const userId of userIds) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }
}

export function getOnlineUserIds(userIds: number[]): number[] {
  return userIds.filter(id => {
    const sockets = userSockets.get(id);
    return !!sockets && sockets.size > 0;
  });
}

function updatePlayerSocket(userId: number, newWs: WebSocket) {
  if (waitingPlayer && waitingPlayer.userId === userId) {
    waitingPlayer.ws = newWs;
  }

  for (const room of rooms.values()) {
    if (room.player1.userId === userId) {
      room.player1.ws = newWs;
    } else if (room.player2.userId === userId) {
      room.player2.ws = newWs;
    }
  }

  for (const room of partyRooms.values()) {
    if (room.host.userId === userId) {
      room.host.ws = newWs;
    } else {
      const guest = room.guests.find((player) => player.userId === userId);
      if (guest) {
        guest.ws = newWs;
      }
    }
  }
}

async function restoreClientState(userId: number, username: string) {
  const pending = await getUnreadNotifications(userId);
  for (const n of pending) {
    sendToUser(userId, {
      type: "NOTIFICATION",
      id: n.id,
      notifType: n.type,
      payload: n.payload,
      createdAt: n.createdAt.toISOString(),
    });
  }
  // 1. Check if they are in an active matchmaking game
  const foundMatch = getRoomForPlayer(userId);
  if (foundMatch) {
    const { room, side } = foundMatch;
    const opponent = side === "player1" ? room.player2 : room.player1;
    sendToUser(userId, {
      type: "MATCH_FOUND",
      matchId: room.matchId,
      opponentUsername: opponent.username,
      yourSide: side,
    });
    if (room.choices[side]) {
      sendToUser(userId, { type: "WAITING_FOR_OPPONENT" });
    }
    logger.info({ userId, matchId: room.matchId }, "Restored matchmaking game state for reconnected user");
    return;
  }

  // 2. Check if they are in a party room
  const partyRoom = getPartyRoomByUserId(userId);
  if (partyRoom) {
    const state = serializePartyRoom(partyRoom);
    if (partyRoom.host.userId === userId) {
      sendToUser(userId, { type: "ROOM_CREATED", ...state });
    } else {
      sendToUser(userId, { type: "ROOM_JOINED", ...state });
    }

    if (partyRoom.messages.length > 0) {
      for (const message of partyRoom.messages.slice(-20)) {
        sendToUser(userId, { type: "ROOM_CHAT", code: partyRoom.code, ...message });
      }
    }

    if (partyRoom.matchId !== null) {
      sendSyncMatchState(userId, partyRoom.matchId);
    }
    logger.info({ userId, roomCode: partyRoom.code }, "Restored party room state for reconnected user");
    return;
  }

  // 3. Check if they were waiting in queue
  if (waitingPlayer && waitingPlayer.userId === userId) {
    sendToUser(userId, { type: "QUEUE_JOINED" });
    logger.info({ userId }, "Restored queue state for reconnected user");
    return;
  }
}

function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (partyRooms.has(code));
  return code;
}

function serializePartyRoom(room: PartyRoom) {
  const guestUsernames = room.guests.map((guest) => guest.username);
  return {
    code: room.code,
    hostUsername: room.host.username,
    guestUsername: guestUsernames[0] ?? null,
    guestUsernames,
    canChat: room.guests.length > 0,
    matchId: room.matchId,
  };
}

function getPartyRoomByUserId(userId: number): PartyRoom | null {
  const code = playerPartyRoom.get(userId);
  if (!code) return null;
  const room = partyRooms.get(code) ?? null;
  if (!room) {
    playerPartyRoom.delete(userId);
    return null;
  }
  return room;
}

function broadcastPartyRoomState(room: PartyRoom) {
  const state = serializePartyRoom(room);
  const userIds = [room.host.userId, ...room.guests.map((guest) => guest.userId)];
  broadcastToUsers(userIds, { type: "ROOM_UPDATED", ...state });
}

function broadcastPartyRoomChat(room: PartyRoom, message: PartyRoomMessage) {
  const userIds = [room.host.userId, ...room.guests.map((guest) => guest.userId)];
  broadcastToUsers(userIds, { type: "ROOM_CHAT" as const, code: room.code, ...message });
}

function clearPartyRoomMatch(room: PartyRoom) {
  if (room.matchId === null) return;

  room.matchId = null;
  broadcastPartyRoomState(room);
}

async function finalize1v1Forfeit(matchId: number, quitterId: number, reason: "disconnect_timeout" | "abandon" = "disconnect_timeout") {
  clearDisconnectGrace(quitterId);

  const room = rooms.get(matchId);
  if (!room) return;

  const isPlayer1 = room.player1.userId === quitterId;
  const isPlayer2 = room.player2.userId === quitterId;
  if (!isPlayer1 && !isPlayer2) return;

  const winner = isPlayer1 ? room.player2 : room.player1;
  const loser = isPlayer1 ? room.player1 : room.player2;
  const partyRoom = Array.from(partyRooms.values()).find((r) => r.matchId === matchId);

  await db
    .update(matchesTable)
    .set({
      status: "COMPLETED",
      winnerId: winner.userId,
      completedAt: new Date(),
    })
    .where(eq(matchesTable.id, matchId))
    .catch((err: unknown) => logger.error({ err }, "Failed to finalize match after forfeit"));

  sendToUser(winner.userId, {
    type: "MATCH_OVER",
    winnerId: winner.userId,
    player1Score: room.player1Score,
    player2Score: room.player2Score,
  });
  sendToUser(loser.userId, {
    type: "MATCH_OVER",
    winnerId: winner.userId,
    player1Score: room.player1Score,
    player2Score: room.player2Score,
  });

  if (partyRoom) {
    clearPartyRoomMatch(partyRoom);

    setTimeout(() => {
      const memberIds = [partyRoom.host.userId, ...partyRoom.guests.map((guest) => guest.userId)];
      for (const id of memberIds) {
        sendToUser(id, { type: "ROOM_CLOSED", code: partyRoom.code, reason: "closed" });
        playerPartyRoom.delete(id);
      }
      partyRooms.delete(partyRoom.code);
    }, 3000);
  }

  rooms.delete(matchId);
  rematchOffers.delete(matchId);

  logger.info({ matchId, quitterId, winnerId: winner.userId, reason }, "1v1 match finalized");
}

// Used only for genuine (accidental) disconnects. Gives the disconnected player 8s
// to reconnect before the match is forfeited. A voluntary abandon has no grace period
// at all - see handleAbandonMatch, which finalizes the forfeit immediately.
function startDisconnectGracePeriod(room: Room, quitterId: number) {
  if (disconnectTimeouts.has(quitterId)) {
    return;
  }

  const matchId = room.matchId;
  const opponent = room.player1.userId === quitterId ? room.player2 : room.player1;
  send(opponent.ws, { type: "OPPONENT_TEMPORARILY_DISCONNECTED" });

  const timeout = setTimeout(() => {
    void finalize1v1Forfeit(matchId, quitterId, "disconnect_timeout");
  }, 8000);

  disconnectTimeouts.set(quitterId, timeout);
  logger.info({ matchId: room.matchId, userId: quitterId }, "Started 1v1 disconnect grace period");
}

function resolveRound3v3(p1: string, p2: string, p3: string): {
  outcomes: ("WIN" | "LOSS" | "DRAW")[];
  scoreChanges: number[];
} {
  const beats = (a: string, b: string): number => {
    if (a === b) return 0;
    if (
      (a === "TITAN" && b === "RAZOR") ||
      (a === "RAZOR" && b === "WRAITH") ||
      (a === "WRAITH" && b === "TITAN")
    ) {
      return 1;
    }
    return -1;
  };

  const sc1 = beats(p1, p2) + beats(p1, p3);
  const sc2 = beats(p2, p1) + beats(p2, p3);
  const sc3 = beats(p3, p1) + beats(p3, p2);

  const outcome = (sc: number): "WIN" | "LOSS" | "DRAW" => {
    if (sc > 0) return "WIN";
    if (sc < 0) return "LOSS";
    return "DRAW";
  };

  return {
    outcomes: [outcome(sc1), outcome(sc2), outcome(sc3)],
    scoreChanges: [sc1, sc2, sc3],
  };
}

function sendSyncMatchState(userId: number, matchId: number) {
  const room1v1 = rooms.get(matchId);
  if (room1v1) {
    const side = room1v1.player1.userId === userId ? "player1" : "player2";
    const opponent = side === "player1" ? room1v1.player2 : room1v1.player1;
    sendToUser(userId, {
      type: "MATCH_FOUND",
      matchId,
      opponentUsername: opponent.username,
      yourSide: side,
    });
    if (room1v1.choices[side]) {
      sendToUser(userId, { type: "WAITING_FOR_OPPONENT" });
    }
    return;
  }

  const matchRoom = rooms3v3.get(matchId);
  if (matchRoom) {
    const playersPayload = matchRoom.players.map((p) => ({
      username: p.username,
      choice: p.userId === userId ? matchRoom.choices[p.userId] : (matchRoom.choices[p.userId] ? "chosen" : null),
      score: matchRoom.scores[p.userId],
    }));
    sendToUser(userId, {
      type: "MATCH_3V3_UPDATE",
      roundNumber: matchRoom.roundNumber,
      players: playersPayload,
    });
  }
}

async function createMultiPlayerMatch(player1: ConnectedPlayer, player2: ConnectedPlayer) {
  const [match] = await db
    .insert(matchesTable)
    .values({
      player1Id: player1.userId,
      player2Id: player2.userId,
      mode: "MULTIPLAYER",
      status: "ACTIVE",
      player1Score: 0,
      player2Score: 0,
    })
    .returning();

  const room: Room = {
    matchId: match.id,
    player1,
    player2,
    roundNumber: 1,
    choices: {},
    player1Score: 0,
    player2Score: 0,
  };

  rooms.set(match.id, room);
  return match.id;
}

function sendMatchFound(player1: ConnectedPlayer, player2: ConnectedPlayer, matchId: number) {
  sendToUser(player1.userId, { type: "MATCH_FOUND", matchId, opponentUsername: player2.username, yourSide: "player1" });
  sendToUser(player2.userId, { type: "MATCH_FOUND", matchId, opponentUsername: player1.username, yourSide: "player2" });
}

function detachPlayerFromPartyRoom(userId: number, reason: "host_left" | "closed" = "closed") {
  const room = getPartyRoomByUserId(userId);
  if (!room) return;

  const departingUsername =
    room.host.userId === userId
      ? room.host.username
      : (room.guests.find((guest) => guest.userId === userId)?.username ?? "Convidado");

  if (room.host.userId === userId) {
    for (const guest of room.guests) {
      sendToUser(guest.userId, { type: "ROOM_CLOSED", code: room.code, reason });
      playerPartyRoom.delete(guest.userId);
    }
    partyRooms.delete(room.code);
    playerPartyRoom.delete(room.host.userId);
    return;
  }

  room.guests = room.guests.filter((guest) => guest.userId !== userId);
  playerPartyRoom.delete(userId);
  sendToUser(room.host.userId, { type: "ROOM_PLAYER_LEFT", code: room.code, username: departingUsername });
  broadcastPartyRoomState(room);
}

async function handleCreateRoom(player: ConnectedPlayer, mode: "1v1" | "3v3" = "1v1") {
  if (getPartyRoomByUserId(player.userId)) {
    sendToUser(player.userId, { type: "ERROR", message: "Você já está em uma sala." });
    return;
  }

  const code = generateRoomCode();
  const room: PartyRoom = {
    code,
    host: player,
    guests: [],
    mode,
    matchId: null,
    messages: [],
  };

  partyRooms.set(code, room);
  playerPartyRoom.set(player.userId, code);

  sendToUser(player.userId, { type: "ROOM_CREATED", ...serializePartyRoom(room) });
}

async function handleInviteToPlay(player: ConnectedPlayer, targetUserId: number) {
  const targetSockets = userSockets.get(targetUserId);
  if (!targetSockets || targetSockets.size === 0) {
    sendToUser(player.userId, { type: "ERROR", message: "Este amigo está offline no momento." });
    return;
  }

  let room = getPartyRoomByUserId(player.userId);

  if (!room) {
    const code = generateRoomCode();
    room = {
      code,
      host: player,
      guests: [],
      mode: "1v1",
      matchId: null,
      messages: [],
    };
    partyRooms.set(code, room);
    playerPartyRoom.set(player.userId, code);
    sendToUser(player.userId, { type: "ROOM_CREATED", ...serializePartyRoom(room) });
  }

  sendToUser(targetUserId, {
    type: "GAME_INVITE_RECEIVED",
    fromUsername: player.username,
    roomCode: room.code,
  });
}

async function handleJoinRoom(player: ConnectedPlayer, codeRaw: string) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) {
    sendToUser(player.userId, { type: "ERROR", message: "Informe o código da sala." });
    return;
  }

  const existing = getPartyRoomByUserId(player.userId);
  if (existing) {
    if (existing.code !== code) {
      sendToUser(player.userId, { type: "ERROR", message: "Você já está em uma sala. Saia dela antes de entrar em outra." });
      return;
    }
  }

  const room = partyRooms.get(code);
  if (!room) {
    sendToUser(player.userId, { type: "ROOM_NOT_FOUND", code });
    return;
  }

  const alreadyInRoom =
    room.host.userId === player.userId || room.guests.some((guest) => guest.userId === player.userId);
  const maxGuests = room.mode === "3v3" ? 2 : 1;
  if (!alreadyInRoom && room.guests.length >= maxGuests) {
    sendToUser(player.userId, { type: "ROOM_FULL", code });
    return;
  }

  if (room.host.userId === player.userId) {
    sendToUser(player.userId, { type: "ROOM_JOINED", ...serializePartyRoom(room) });
    return;
  }

  if (!room.guests.some((guest) => guest.userId === player.userId)) {
    room.guests.push(player);
  }
  playerPartyRoom.set(player.userId, room.code);

  const isFull = room.guests.length === maxGuests;
  if (isFull && room.matchId === null) {
    if (room.mode === "1v1") {
      const matchId = await createMultiPlayerMatch(room.host, room.guests[0]);
      room.matchId = matchId;
      sendMatchFound(room.host, room.guests[0], matchId);
    } else if (room.mode === "3v3") {
      const matchId = Math.floor(Math.random() * 100000000) + 1;
      room.matchId = matchId;
      
      const match3v3: Room3v3 = {
        matchId,
        code: room.code,
        players: [room.host, ...room.guests],
        roundNumber: 1,
        choices: {},
        scores: {},
      };
      for (const p of match3v3.players) {
        match3v3.choices[p.userId] = null;
        match3v3.scores[p.userId] = 0;
      }
      rooms3v3.set(matchId, match3v3);
      logger.info({ matchId, code: room.code }, "3v3 Match started in party room");
    }
  }

  const state = serializePartyRoom(room);
  sendToUser(player.userId, { type: "ROOM_JOINED", ...state });
  for (const other of [room.host, ...room.guests].filter((p) => p.userId !== player.userId)) {
    sendToUser(other.userId, { type: "ROOM_UPDATED", ...state });
  }

  if (room.messages.length > 0) {
    for (const message of room.messages.slice(-20)) {
      sendToUser(player.userId, { type: "ROOM_CHAT", code: room.code, ...message });
    }
  }
}

function handleLeaveRoom(player: ConnectedPlayer) {
  detachPlayerFromPartyRoom(player.userId, "closed");
}

function handleRoomChat(player: ConnectedPlayer, text: string) {
  const room = getPartyRoomByUserId(player.userId);
  if (!room) {
    sendToUser(player.userId, { type: "ERROR", message: "Você não está em uma sala." });
    return;
  }

  if (room.guests.length === 0) {
    sendToUser(player.userId, { type: "ERROR", message: "A sala precisa de pelo menos dois jogadores para o chat." });
    return;
  }

  const normalized = text.trim();
  if (!normalized) return;

  const message: PartyRoomMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderId: player.userId,
    senderUsername: player.username,
    text: normalized,
    createdAt: new Date().toISOString(),
  };

  room.messages.push(message);
  if (room.messages.length > 50) {
    room.messages.splice(0, room.messages.length - 50);
  }

  broadcastPartyRoomChat(room, message);
}

function getRoomForPlayer(userId: number): { room: Room; side: "player1" | "player2" } | null {
  for (const room of rooms.values()) {
    if (room.player1.userId === userId) return { room, side: "player1" };
    if (room.player2.userId === userId) return { room, side: "player2" };
  }
  return null;
}

async function handleJoinQueue(player: ConnectedPlayer) {
  const foundMatch = getRoomForPlayer(player.userId);
  if (foundMatch) {
    const { room, side } = foundMatch;
    const opponent = side === "player1" ? room.player2 : room.player1;
    sendToUser(player.userId, {
      type: "MATCH_FOUND",
      matchId: room.matchId,
      opponentUsername: opponent.username,
      yourSide: side,
    });
    if (room.choices[side]) {
      sendToUser(player.userId, { type: "WAITING_FOR_OPPONENT" });
    }
    return;
  }

  if (waitingPlayer && waitingPlayer.userId === player.userId) {
    sendToUser(player.userId, { type: "ERROR", message: "Você já está na fila." });
    return;
  }

  if (!waitingPlayer) {
    waitingPlayer = player;
    sendToUser(player.userId, { type: "QUEUE_JOINED" });
    logger.info({ userId: player.userId }, "Player joined queue");
    return;
  }

  const opponent = waitingPlayer;
  waitingPlayer = null;

  try {
    const [match] = await db
      .insert(matchesTable)
      .values({
        player1Id: opponent.userId,
        player2Id: player.userId,
        mode: "MULTIPLAYER",
        status: "ACTIVE",
        player1Score: 0,
        player2Score: 0,
      })
      .returning();

    const room: Room = {
      matchId: match.id,
      player1: opponent,
      player2: player,
      roundNumber: 1,
      choices: {},
      player1Score: 0,
      player2Score: 0,
    };
    rooms.set(match.id, room);

    logger.info({ matchId: match.id, p1: opponent.userId, p2: player.userId }, "Multiplayer match created");

    sendToUser(opponent.userId, { type: "MATCH_FOUND", matchId: match.id, opponentUsername: player.username, yourSide: "player1" });
    sendToUser(player.userId, { type: "MATCH_FOUND", matchId: match.id, opponentUsername: opponent.username, yourSide: "player2" });
  } catch (err) {
    logger.error({ err }, "Failed to create multiplayer match");
    sendToUser(player.userId, { type: "ERROR", message: "Falha ao criar partida." });
    sendToUser(opponent.userId, { type: "ERROR", message: "Falha ao criar partida." });
    waitingPlayer = null;
  }
}

async function handleSubmitChoice(player: ConnectedPlayer, matchId: number, elemental: Elemental) {
  const room = rooms.get(matchId);
  if (!room) {
    const matchRoom = rooms3v3.get(matchId);
    if (matchRoom) {
      if (matchRoom.choices[player.userId] !== null) {
        sendToUser(player.userId, { type: "ERROR", message: "Você já escolheu seu elemental." });
        return;
      }
      matchRoom.choices[player.userId] = elemental;

      // Broadcast choice to others, masking other players' choices
      for (const p of matchRoom.players) {
        const playersPayload = matchRoom.players.map((other) => ({
          username: other.username,
          choice: other.userId === p.userId ? matchRoom.choices[other.userId] : (matchRoom.choices[other.userId] ? "chosen" : null),
          score: matchRoom.scores[other.userId],
        }));
        sendToUser(p.userId, {
          type: "MATCH_3V3_UPDATE",
          roundNumber: matchRoom.roundNumber,
          players: playersPayload,
        });
      }

      // Check if all players have submitted
      const allSubmitted = matchRoom.players.every((p) => matchRoom.choices[p.userId] !== null);
      if (!allSubmitted) {
        return;
      }

      // All players have submitted! Resolve the round.
      const choices = matchRoom.players.map((p) => matchRoom.choices[p.userId] as string);
      const { outcomes, scoreChanges } = resolveRound3v3(choices[0], choices[1], choices[2]);

      // Update scores
      matchRoom.players.forEach((p, idx) => {
        matchRoom.scores[p.userId] += scoreChanges[idx];
      });

      const roundNumber = matchRoom.roundNumber;
      const choicesMap: Record<string, string> = {};
      const outcomesMap: Record<string, "WIN" | "LOSS" | "DRAW"> = {};
      const scoresMap: Record<string, number> = {};

      matchRoom.players.forEach((p, idx) => {
        choicesMap[p.username] = choices[idx];
        outcomesMap[p.username] = outcomes[idx];
        scoresMap[p.username] = matchRoom.scores[p.userId];
      });

      // Reset choices for next round
      for (const p of matchRoom.players) {
        matchRoom.choices[p.userId] = null;
      }
      matchRoom.roundNumber++;

      const isMatchOver = matchRoom.roundNumber > 3;

      if (isMatchOver) {
        for (const p of matchRoom.players) {
          sendToUser(p.userId, {
            type: "MATCH_3V3_ROUND_RESULT",
            roundNumber,
            choices: choicesMap,
            outcomes: outcomesMap,
            scores: scoresMap,
          });
          setTimeout(() => {
            sendToUser(p.userId, {
              type: "MATCH_3V3_OVER",
              scores: scoresMap,
            });
          }, 3000);
        }
        // Clean up
        const partyRoom = Array.from(partyRooms.values()).find((r) => r.matchId === matchId);
        if (partyRoom) {
          partyRoom.matchId = null;
          broadcastPartyRoomState(partyRoom);
        }
        rooms3v3.delete(matchId);
      } else {
        for (const p of matchRoom.players) {
          sendToUser(p.userId, {
            type: "MATCH_3V3_ROUND_RESULT",
            roundNumber,
            choices: choicesMap,
            outcomes: outcomesMap,
            scores: scoresMap,
          });
        }
      }
      return;
    }

    sendToUser(player.userId, { type: "ERROR", message: "Partida não encontrada." });
    return;
  }

  const side = room.player1.userId === player.userId ? "player1" : "player2";

  if (room.choices[side]) {
    sendToUser(player.userId, { type: "ERROR", message: "Você já enviou sua escolha." });
    return;
  }

  room.choices[side] = elemental;
  sendToUser(player.userId, { type: "WAITING_FOR_OPPONENT" });

  if (!room.choices.player1 || !room.choices.player2) return;

  const p1Choice = room.choices.player1;
  const p2Choice = room.choices.player2;
  const outcome = resolveRound(p1Choice, p2Choice);

  if (outcome === "WIN") room.player1Score++;
  else if (outcome === "LOSS") room.player2Score++;

  const roundNumber = room.roundNumber;

  try {
    await db.insert(roundsTable).values({
      matchId: room.matchId,
      roundNumber,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      outcome,
    });

    const isMatchOver =
      room.player1Score >= 2 || room.player2Score >= 2 || roundNumber >= 3;

    let winnerId: number | null = null;
    if (isMatchOver) {
      if (room.player1Score > room.player2Score) winnerId = room.player1.userId;
      else if (room.player2Score > room.player1Score) winnerId = room.player2.userId;
      else winnerId = null;

      await db
        .update(matchesTable)
        .set({
          player1Score: room.player1Score,
          player2Score: room.player2Score,
          status: "COMPLETED",
          winnerId,
          completedAt: new Date(),
        })
        .where(eq(matchesTable.id, room.matchId));
    } else {
      await db
        .update(matchesTable)
        .set({ player1Score: room.player1Score, player2Score: room.player2Score })
        .where(eq(matchesTable.id, room.matchId));
    }

    const p1Outcome = outcome === "WIN" ? "WIN" : outcome === "LOSS" ? "LOSS" : "DRAW";
    const p2Outcome = outcome === "WIN" ? "LOSS" : outcome === "LOSS" ? "WIN" : "DRAW";

    sendToUser(room.player1.userId, {
      type: "ROUND_RESULT",
      roundNumber,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      yourOutcome: p1Outcome,
      player1Score: room.player1Score,
      player2Score: room.player2Score,
    });
    sendToUser(room.player2.userId, {
      type: "ROUND_RESULT",
      roundNumber,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      yourOutcome: p2Outcome,
      player1Score: room.player1Score,
      player2Score: room.player2Score,
    });

    if (isMatchOver) {
      const p1 = room.player1;
      const p2 = room.player2;
      const finishedMatchId = room.matchId;
      const partyRoom = Array.from(partyRooms.values()).find((r) => r.matchId === finishedMatchId);

      if (partyRoom) {
        clearPartyRoomMatch(partyRoom);
      }

      setTimeout(() => {
        const userIds = [p1.userId, p2.userId];
        broadcastToUsers(userIds, { type: "MATCH_OVER", winnerId, player1Score: room.player1Score, player2Score: room.player2Score });
        // Register rematch slot so both players can offer a rematch
        rematchOffers.set(finishedMatchId, { player1: p1, player2: p2, offered: new Set() });
        // Clean up after 3 minutes if no rematch accepted
        setTimeout(() => rematchOffers.delete(finishedMatchId), 3 * 60 * 1000);
      }, 3000);
      rooms.delete(room.matchId);
    } else {
      room.roundNumber++;
      room.choices = {};
    }
  } catch (err) {
    logger.error({ err }, "Error resolving round");
    sendToUser(player.userId, { type: "ERROR", message: "Erro ao processar rodada." });
  }
}

async function handleOfferRematch(player: ConnectedPlayer, matchId: number) {
  const slot = rematchOffers.get(matchId);
  if (!slot) {
    sendToUser(player.userId, { type: "ERROR", message: "Revanche não disponível." });
    return;
  }

  const isPlayer1 = slot.player1.userId === player.userId;
  const isPlayer2 = slot.player2.userId === player.userId;
  if (!isPlayer1 && !isPlayer2) {
    sendToUser(player.userId, { type: "ERROR", message: "Você não fez parte desta partida." });
    return;
  }

  slot.offered.add(player.userId);
  const opponent = isPlayer1 ? slot.player2 : slot.player1;

  if (slot.offered.size === 1) {
    // First offer — notify self to wait, tell opponent they were offered
    sendToUser(player.userId, { type: "REMATCH_WAITING" });
    sendToUser(opponent.userId, { type: "REMATCH_OFFERED" });
    return;
  }

  // Both offered — create a new match and room
  rematchOffers.delete(matchId);
  try {
    const [newMatch] = await db
      .insert(matchesTable)
      .values({
        player1Id: slot.player1.userId,
        player2Id: slot.player2.userId,
        mode: "MULTIPLAYER",
        status: "ACTIVE",
        player1Score: 0,
        player2Score: 0,
      })
      .returning();

    const room: Room = {
      matchId: newMatch.id,
      player1: slot.player1,
      player2: slot.player2,
      roundNumber: 1,
      choices: {},
      player1Score: 0,
      player2Score: 0,
    };
    rooms.set(newMatch.id, room);

    logger.info({ matchId: newMatch.id }, "Rematch match created");

    sendToUser(slot.player1.userId, { type: "MATCH_FOUND", matchId: newMatch.id, opponentUsername: slot.player2.username, yourSide: "player1" });
    sendToUser(slot.player2.userId, { type: "MATCH_FOUND", matchId: newMatch.id, opponentUsername: slot.player1.username, yourSide: "player2" });
  } catch (err) {
    logger.error({ err }, "Failed to create rematch");
    sendToUser(slot.player1.userId, { type: "ERROR", message: "Falha ao criar revanche." });
    sendToUser(slot.player2.userId, { type: "ERROR", message: "Falha ao criar revanche." });
  }
}

async function handleAbandonMatch(player: ConnectedPlayer, matchId: number) {
  // 1. Check 1v1 active rooms
  const room = rooms.get(matchId);
  if (room) {
    const isPlayer1 = room.player1.userId === player.userId;
    const isPlayer2 = room.player2.userId === player.userId;
    if (isPlayer1 || isPlayer2) {
      // Voluntary abandon is a final, already-confirmed decision (the client asks
      // "Tens a certeza?" before sending this) - no grace period, instant win for
      // whoever remains.
      await finalize1v1Forfeit(matchId, player.userId, "abandon");
      logger.info({ matchId, userId: player.userId }, "Player voluntarily abandoned 1v1 match; instant forfeit");
    }
    return;
  }

  // 2. Check 3v3 active rooms
  const match3v3 = rooms3v3.get(matchId);
  if (match3v3) {
    if (match3v3.players.some((p) => p.userId === player.userId)) {
      for (const p of match3v3.players) {
        if (p.userId !== player.userId) {
          sendToUser(p.userId, { type: "OPPONENT_DISCONNECTED" });
        }
      }
      rooms3v3.delete(matchId);

      await db.update(matchesTable)
        .set({ status: "ABANDONED", completedAt: new Date() })
        .where(eq(matchesTable.id, matchId))
        .catch((err) => logger.error({ err }, "Failed to update 3v3 match on voluntary abandon"));

      // Destruir a PartyRoom por completo, para todos, independente de quem abandonou
      const partyRoom = Array.from(partyRooms.values()).find((r) => r.matchId === matchId);
      if (partyRoom) {
        const memberIds = [partyRoom.host.userId, ...partyRoom.guests.map((g) => g.userId)];
        for (const id of memberIds) {
          sendToUser(id, { type: "ROOM_CLOSED", code: partyRoom.code, reason: "closed" });
          playerPartyRoom.delete(id);
        }
        partyRooms.delete(partyRoom.code);
      }

      logger.info({ matchId, userId: player.userId }, "Player voluntarily abandoned 3v3 match");
    }
  }
}

function startPartyRoomDisconnectGrace(userId: number) {
  if (disconnectTimeouts.has(userId)) {
    return;
  }

  const timeout = setTimeout(() => {
    disconnectTimeouts.delete(userId);
    detachPlayerFromPartyRoom(userId, "host_left");
    logger.info({ userId }, "Player removed from party room after grace period");
  }, 8000);

  disconnectTimeouts.set(userId, timeout);
}

function handleDisconnect(userId: number) {
  if (waitingPlayer?.userId === userId) {
    waitingPlayer = null;
    logger.info({ userId }, "Player left queue on disconnect");
    detachPlayerFromPartyRoom(userId, "host_left");
    return;
  }

  // Check 3v3 matches
  for (const match of rooms3v3.values()) {
    if (match.players.some((p) => p.userId === userId)) {
      for (const p of match.players) {
        if (p.userId !== userId) {
          sendToUser(p.userId, { type: "OPPONENT_DISCONNECTED" });
        }
      }
      rooms3v3.delete(match.matchId);
      const partyRoom = Array.from(partyRooms.values()).find((r) => r.matchId === match.matchId);
      if (partyRoom) {
        partyRoom.matchId = null;
        broadcastPartyRoomState(partyRoom);
      }
      logger.info({ matchId: match.matchId, userId }, "Player disconnected from 3v3 match");
      return;
    }
  }

  const found = getRoomForPlayer(userId);
  if (found) {
    const { room, side } = found;
    // Single grace period for the whole disconnect -> forfeit flow. If the player
    // reconnects before it elapses, the "connection" handler cancels this timer and
    // nothing else happens. The party room is only ever closed by finalize1v1Forfeit,
    // i.e. once the grace period has genuinely run out without a reconnection.
    startDisconnectGracePeriod(room, userId);
    logger.info({ matchId: room.matchId, userId, side }, "Player disconnected from match; grace period started");
    return;
  }

  // Not in queue, not in an active 1v1/3v3 match: no match-forfeit grace applies here,
  // but we still give a single grace period before evicting the player from the party room.
  startPartyRoomDisconnectGrace(userId);
}

export function attachWsServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "", `http://localhost`);
    if (!url.pathname.endsWith("/ws")) {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, payload);
    });
  });

  wss.on("connection", async (ws: WebSocket, _req: IncomingMessage, payload: { userId: number; username: string }) => {
    let player: ConnectedPlayer | null = null;
    const pendingMessages: string[] = [];

    const handleClientMessage = async (rawData: string) => {
      if (!player) {
        pendingMessages.push(rawData);
        return;
      }

      let msg: ClientMsg;
      try {
        msg = JSON.parse(rawData) as ClientMsg;
      } catch {
        sendToUser(player.userId, { type: "ERROR", message: "Mensagem inválida." });
        return;
      }

      switch (msg.type) {
        case "JOIN_QUEUE":
          await handleJoinQueue(player);
          break;
        case "LEAVE_QUEUE":
          if (waitingPlayer?.userId === player.userId) waitingPlayer = null;
          break;
        case "SUBMIT_CHOICE":
          await handleSubmitChoice(player, msg.matchId, msg.elemental);
          break;
        case "OFFER_REMATCH":
          await handleOfferRematch(player, msg.matchId);
          break;
        case "CREATE_ROOM":
          await handleCreateRoom(player, msg.mode ?? "1v1");
          break;
        case "JOIN_ROOM":
          await handleJoinRoom(player, msg.code);
          break;
        case "LEAVE_ROOM":
          handleLeaveRoom(player);
          break;
        case "SEND_ROOM_CHAT":
          handleRoomChat(player, msg.text);
          break;
        case "INVITE_TO_PLAY":
          await handleInviteToPlay(player, msg.targetUserId);
          break;
        case "PING":
          sendToUser(player.userId, { type: "PONG" });
          break;
        case "SYNC_MATCH":
          sendSyncMatchState(player.userId, msg.matchId);
          break;
        case "ABANDON_MATCH":
          await handleAbandonMatch(player, msg.matchId);
          break;
      }
    };

    ws.on("message", (data) => {
      void handleClientMessage(data.toString());
    });

    try {
      const [user] = await db
        .select({ id: usersTable.id, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);

      if (!user) {
        ws.close(1008, "User not found");
        return;
      }

      player = { ws, userId: user.id, username: user.username };
      logger.info({ userId: user.id }, "WS client connected");

      // Register socket in connection manager
      let sockets = userSockets.get(user.id);
      if (!sockets) {
        sockets = new Set();
        userSockets.set(user.id, sockets);
      }
      sockets.add(ws);

      // Cancel disconnection grace period if active. Only genuine disconnects ever
      // reach this map (a voluntary abandon finalizes instantly, see
      // handleAbandonMatch), so any pending entry here is always safe to cancel.
      const timeout = disconnectTimeouts.get(user.id);
      if (timeout) {
        clearTimeout(timeout);
        disconnectTimeouts.delete(user.id);
        logger.info({ userId: user.id }, "Player reconnected within grace period; timeout cancelled");

        // Notify opponent of reconnection
        const matchRoom = getRoomForPlayer(user.id);
        if (matchRoom) {
          const opponent = matchRoom.side === "player1" ? matchRoom.room.player2 : matchRoom.room.player1;
          send(opponent.ws, { type: "OPPONENT_RECONNECTED" });
        } else {
          const partyRoom = getPartyRoomByUserId(user.id);
          if (partyRoom && partyRoom.matchId !== null) {
            const activeMatchRoom = rooms.get(partyRoom.matchId);
            if (activeMatchRoom) {
              const side = activeMatchRoom.player1.userId === user.id ? "player1" : "player2";
              const opponent = side === "player1" ? activeMatchRoom.player2 : activeMatchRoom.player1;
              send(opponent.ws, { type: "OPPONENT_RECONNECTED" });
            } else {
              const active3v3Room = rooms3v3.get(partyRoom.matchId);
              if (active3v3Room) {
                for (const p of active3v3Room.players) {
                  if (p.userId !== user.id) {
                    sendToUser(p.userId, { type: "OPPONENT_RECONNECTED" });
                  }
                }
              }
            }
          }
        }
      }

      // Update socket references in active games/rooms
      updatePlayerSocket(user.id, ws);

      // Restore UI state for the client
      restoreClientState(user.id, user.username);

      for (const rawData of pendingMessages.splice(0)) {
        void handleClientMessage(rawData);
      }
    } catch {
      ws.close(1011, "Server error");
      return;
    }

    ws.on("close", () => {
      if (player) {
        const userId = player.userId;
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            userSockets.delete(userId);

            // Notify opponent of temporary disconnection
            const matchRoom = getRoomForPlayer(userId);
            if (matchRoom) {
              const opponent = matchRoom.side === "player1" ? matchRoom.room.player2 : matchRoom.room.player1;
              send(opponent.ws, { type: "OPPONENT_TEMPORARILY_DISCONNECTED" });
            } else {
              const partyRoom = getPartyRoomByUserId(userId);
              if (partyRoom && partyRoom.matchId !== null) {
                const activeMatchRoom = rooms.get(partyRoom.matchId);
                if (activeMatchRoom) {
                  const side = activeMatchRoom.player1.userId === userId ? "player1" : "player2";
                  const opponent = side === "player1" ? activeMatchRoom.player2 : activeMatchRoom.player1;
                  send(opponent.ws, { type: "OPPONENT_TEMPORARILY_DISCONNECTED" });
                } else {
                  const active3v3Room = rooms3v3.get(partyRoom.matchId);
                  if (active3v3Room) {
                    for (const p of active3v3Room.players) {
                      if (p.userId !== userId) {
                        sendToUser(p.userId, { type: "OPPONENT_TEMPORARILY_DISCONNECTED" });
                      }
                    }
                  }
                }
              }
            }

            // Evaluate the single grace period immediately. handleDisconnect decides
            // whether a match-forfeit grace applies (startDisconnectGracePeriod, 8s) or a
            // plain party-room grace applies (startPartyRoomDisconnectGrace, 8s) -
            // never both stacked on top of each other. Voluntary abandons never reach
            // here at all; they finalize instantly via handleAbandonMatch.
            logger.info({ userId }, "All client sockets disconnected; evaluating grace period");
            handleDisconnect(userId);
          } else {
            logger.info({ userId, remainingSockets: sockets.size }, "Client closed one socket, other sockets still active");
          }
        }
        logger.info({ userId: player.userId }, "WS client disconnected");
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WS error");
    });
  });

  logger.info("WebSocket server attached");
}