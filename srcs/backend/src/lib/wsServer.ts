import { WebSocketServer, WebSocket } from "ws";
import { type IncomingMessage } from "http";
import { type Server } from "http";
import { db, matchesTable, roundsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "./auth.js";
import { resolveRound, type Elemental } from "./gameEngine.js";
import { logger } from "./logger.js";

type ServerMsg =
  | { type: "QUEUE_JOINED" }
  | { type: "MATCH_FOUND"; matchId: number; opponentUsername: string; yourSide: "player1" | "player2" }
  | { type: "WAITING_FOR_OPPONENT" }
  | { type: "ROUND_RESULT"; roundNumber: number; player1Choice: Elemental; player2Choice: Elemental; yourOutcome: "WIN" | "LOSS" | "DRAW"; player1Score: number; player2Score: number }
  | { type: "MATCH_OVER"; winnerId: number | null; player1Score: number; player2Score: number }
  | { type: "REMATCH_OFFERED" }
  | { type: "REMATCH_WAITING" }
  | { type: "OPPONENT_DISCONNECTED" }
  | { type: "ROOM_CREATED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_JOINED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_UPDATED"; code: string; hostUsername: string; guestUsername: string | null; canChat: boolean; matchId: number | null }
  | { type: "ROOM_CHAT"; code: string; id: string; senderId: number; senderUsername: string; text: string; createdAt: string }
  | { type: "ROOM_PLAYER_LEFT"; code: string; username: string }
  | { type: "ROOM_CLOSED"; code: string; reason: "host_left" | "closed" }
  | { type: "ROOM_FULL"; code: string }
  | { type: "ROOM_NOT_FOUND"; code: string }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };

type ClientMsg =
  | { type: "JOIN_QUEUE" }
  | { type: "LEAVE_QUEUE" }
  | { type: "SUBMIT_CHOICE"; matchId: number; elemental: Elemental }
  | { type: "OFFER_REMATCH"; matchId: number }
  | { type: "CREATE_ROOM" }
  | { type: "JOIN_ROOM"; code: string }
  | { type: "LEAVE_ROOM" }
  | { type: "SEND_ROOM_CHAT"; text: string }
  | { type: "PING" };

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
  guest: ConnectedPlayer | null;
  matchId: number | null;
  messages: PartyRoomMessage[];
}

let waitingPlayer: ConnectedPlayer | null = null;
const rooms = new Map<number, Room>();
const partyRooms = new Map<string, PartyRoom>();
const playerPartyRoom = new Map<number, string>();
// rematchOffers: matchId → set of userIds that offered rematch
const rematchOffers = new Map<number, { player1: ConnectedPlayer; player2: ConnectedPlayer; offered: Set<number> }>();

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
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
  return {
    code: room.code,
    hostUsername: room.host.username,
    guestUsername: room.guest?.username ?? null,
    canChat: Boolean(room.guest),
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
  send(room.host.ws, { type: "ROOM_UPDATED", ...state });
  if (room.guest) send(room.guest.ws, { type: "ROOM_UPDATED", ...state });
}

function broadcastPartyRoomChat(room: PartyRoom, message: PartyRoomMessage) {
  const payload = { type: "ROOM_CHAT" as const, code: room.code, ...message };
  send(room.host.ws, payload);
  if (room.guest) send(room.guest.ws, payload);
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
  send(player1.ws, { type: "MATCH_FOUND", matchId, opponentUsername: player2.username, yourSide: "player1" });
  send(player2.ws, { type: "MATCH_FOUND", matchId, opponentUsername: player1.username, yourSide: "player2" });
}

function detachPlayerFromPartyRoom(userId: number, reason: "host_left" | "closed" = "closed") {
  const room = getPartyRoomByUserId(userId);
  if (!room) return;

  const departingUsername = room.host.userId === userId ? room.host.username : (room.guest?.username ?? "Convidado");

  if (room.host.userId === userId) {
    if (room.guest) {
      send(room.guest.ws, { type: "ROOM_CLOSED", code: room.code, reason });
      playerPartyRoom.delete(room.guest.userId);
    }
    partyRooms.delete(room.code);
    playerPartyRoom.delete(room.host.userId);
    return;
  }

  room.guest = null;
  playerPartyRoom.delete(userId);
  send(room.host.ws, { type: "ROOM_PLAYER_LEFT", code: room.code, username: departingUsername });
  broadcastPartyRoomState(room);
}

async function handleCreateRoom(player: ConnectedPlayer) {
  if (getPartyRoomByUserId(player.userId)) {
    send(player.ws, { type: "ERROR", message: "Você já está em uma sala." });
    return;
  }

  const code = generateRoomCode();
  const room: PartyRoom = {
    code,
    host: player,
    guest: null,
    matchId: null,
    messages: [],
  };

  partyRooms.set(code, room);
  playerPartyRoom.set(player.userId, code);

  send(player.ws, { type: "ROOM_CREATED", ...serializePartyRoom(room) });
}

async function handleJoinRoom(player: ConnectedPlayer, codeRaw: string) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) {
    send(player.ws, { type: "ERROR", message: "Informe o código da sala." });
    return;
  }

  const existing = getPartyRoomByUserId(player.userId);
  if (existing) {
    detachPlayerFromPartyRoom(player.userId, "closed");
  }

  const room = partyRooms.get(code);
  if (!room) {
    send(player.ws, { type: "ROOM_NOT_FOUND", code });
    return;
  }

  if (room.guest && room.guest.userId !== player.userId) {
    send(player.ws, { type: "ROOM_FULL", code });
    return;
  }

  if (room.host.userId === player.userId) {
    send(player.ws, { type: "ROOM_JOINED", ...serializePartyRoom(room) });
    return;
  }

  room.guest = player;
  playerPartyRoom.set(player.userId, room.code);

  if (room.matchId === null) {
    try {
      room.matchId = await createMultiPlayerMatch(room.host, room.guest);
      logger.info({ roomCode: room.code, matchId: room.matchId, host: room.host.userId, guest: room.guest.userId }, "Room match created");
    } catch (err) {
      logger.error({ err }, "Failed to create room match");
      send(room.host.ws, { type: "ERROR", message: "Falha ao iniciar a partida da sala." });
      send(player.ws, { type: "ERROR", message: "Falha ao iniciar a partida da sala." });
      room.guest = null;
      playerPartyRoom.delete(player.userId);
      return;
    }
  }

  const state = serializePartyRoom(room);
  send(room.host.ws, { type: "ROOM_UPDATED", ...state });
  send(player.ws, { type: "ROOM_JOINED", ...state });

  if (room.matchId !== null) {
    sendMatchFound(room.host, room.guest, room.matchId);
  }

  if (room.messages.length > 0) {
    for (const message of room.messages.slice(-20)) {
      send(player.ws, { type: "ROOM_CHAT", code: room.code, ...message });
    }
  }
}

function handleLeaveRoom(player: ConnectedPlayer) {
  detachPlayerFromPartyRoom(player.userId, "closed");
}

function handleRoomChat(player: ConnectedPlayer, text: string) {
  const room = getPartyRoomByUserId(player.userId);
  if (!room) {
    send(player.ws, { type: "ERROR", message: "Você não está em uma sala." });
    return;
  }

  if (!room.guest) {
    send(player.ws, { type: "ERROR", message: "A sala precisa de dois jogadores para o chat." });
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
  if (waitingPlayer && waitingPlayer.userId === player.userId) {
    send(player.ws, { type: "ERROR", message: "Você já está na fila." });
    return;
  }

  if (!waitingPlayer) {
    waitingPlayer = player;
    send(player.ws, { type: "QUEUE_JOINED" });
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

    send(opponent.ws, { type: "MATCH_FOUND", matchId: match.id, opponentUsername: player.username, yourSide: "player1" });
    send(player.ws, { type: "MATCH_FOUND", matchId: match.id, opponentUsername: opponent.username, yourSide: "player2" });
  } catch (err) {
    logger.error({ err }, "Failed to create multiplayer match");
    send(player.ws, { type: "ERROR", message: "Falha ao criar partida." });
    send(opponent.ws, { type: "ERROR", message: "Falha ao criar partida." });
    waitingPlayer = null;
  }
}

async function handleSubmitChoice(player: ConnectedPlayer, matchId: number, elemental: Elemental) {
  const room = rooms.get(matchId);
  if (!room) {
    send(player.ws, { type: "ERROR", message: "Partida não encontrada." });
    return;
  }

  const side = room.player1.userId === player.userId ? "player1" : "player2";

  if (room.choices[side]) {
    send(player.ws, { type: "ERROR", message: "Você já enviou sua escolha." });
    return;
  }

  room.choices[side] = elemental;
  send(player.ws, { type: "WAITING_FOR_OPPONENT" });

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

    send(room.player1.ws, {
      type: "ROUND_RESULT",
      roundNumber,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      yourOutcome: p1Outcome,
      player1Score: room.player1Score,
      player2Score: room.player2Score,
    });
    send(room.player2.ws, {
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
      setTimeout(() => {
        send(p1.ws, { type: "MATCH_OVER", winnerId, player1Score: room.player1Score, player2Score: room.player2Score });
        send(p2.ws, { type: "MATCH_OVER", winnerId, player1Score: room.player1Score, player2Score: room.player2Score });
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
    send(player.ws, { type: "ERROR", message: "Erro ao processar rodada." });
  }
}

async function handleOfferRematch(player: ConnectedPlayer, matchId: number) {
  const slot = rematchOffers.get(matchId);
  if (!slot) {
    send(player.ws, { type: "ERROR", message: "Revanche não disponível." });
    return;
  }

  const isPlayer1 = slot.player1.userId === player.userId;
  const isPlayer2 = slot.player2.userId === player.userId;
  if (!isPlayer1 && !isPlayer2) {
    send(player.ws, { type: "ERROR", message: "Você não fez parte desta partida." });
    return;
  }

  slot.offered.add(player.userId);
  const opponent = isPlayer1 ? slot.player2 : slot.player1;

  if (slot.offered.size === 1) {
    // First offer — notify self to wait, tell opponent they were offered
    send(player.ws, { type: "REMATCH_WAITING" });
    send(opponent.ws, { type: "REMATCH_OFFERED" });
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

    send(slot.player1.ws, { type: "MATCH_FOUND", matchId: newMatch.id, opponentUsername: slot.player2.username, yourSide: "player1" });
    send(slot.player2.ws, { type: "MATCH_FOUND", matchId: newMatch.id, opponentUsername: slot.player1.username, yourSide: "player2" });
  } catch (err) {
    logger.error({ err }, "Failed to create rematch");
    send(slot.player1.ws, { type: "ERROR", message: "Falha ao criar revanche." });
    send(slot.player2.ws, { type: "ERROR", message: "Falha ao criar revanche." });
  }
}

function handleDisconnect(userId: number) {
  if (waitingPlayer?.userId === userId) {
    waitingPlayer = null;
    logger.info({ userId }, "Player left queue on disconnect");
    return;
  }

  const found = getRoomForPlayer(userId);
  if (!found) return;

  const { room, side } = found;
  const opponent = side === "player1" ? room.player2 : room.player1;

  send(opponent.ws, { type: "OPPONENT_DISCONNECTED" });
  rooms.delete(room.matchId);

  db.update(matchesTable)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(eq(matchesTable.id, room.matchId))
    .catch((err) => logger.error({ err }, "Failed to update match on disconnect"));

  logger.info({ matchId: room.matchId, userId }, "Player disconnected from match");
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
        send(ws, { type: "ERROR", message: "Mensagem inválida." });
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
          await handleCreateRoom(player);
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
        case "PING":
          send(ws, { type: "PONG" });
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

      for (const rawData of pendingMessages.splice(0)) {
        void handleClientMessage(rawData);
      }
    } catch {
      ws.close(1011, "Server error");
      return;
    }

    ws.on("close", () => {
      if (player) {
        handleDisconnect(player.userId);
        detachPlayerFromPartyRoom(player.userId, "host_left");
        logger.info({ userId: player.userId }, "WS client disconnected");
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WS error");
    });
  });

  logger.info("WebSocket server attached");
}
