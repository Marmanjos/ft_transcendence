export type RoomSession = {
  code: string;
  path: "/room" | "/room/3v3";
};

const ROOM_SESSION_KEY = "elemental_duel_room_session";

export function loadRoomSession(): RoomSession | null {
  try {
    const raw = localStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RoomSession>;
    if (!parsed || typeof parsed.code !== "string" || typeof parsed.path !== "string") {
      return null;
    }

    if (parsed.path !== "/room" && parsed.path !== "/room/3v3") {
      return null;
    }

    return {
      code: parsed.code.trim().toUpperCase(),
      path: parsed.path,
    };
  } catch {
    return null;
  }
}

export function saveRoomSession(session: RoomSession) {
  try {
    localStorage.setItem(
      ROOM_SESSION_KEY,
      JSON.stringify({
        code: session.code.trim().toUpperCase(),
        path: session.path,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function clearRoomSession() {
  try {
    localStorage.removeItem(ROOM_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}
