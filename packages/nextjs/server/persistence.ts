import type { Session } from "./sessionManager";
import type { GameRoom } from "../backend";

type RedisClientType = import("redis").RedisClientType;

let client: RedisClientType | null;
const memorySessions = new Map<string, Omit<Session, "socket" | "timeout">>();
const memoryRooms = new Map<string, GameRoom>();

async function getClient(): Promise<RedisClientType | null> {
  if (client !== undefined) return client;
  try {
    const mod = await import("redis");
    const c = mod.createClient({ url: process.env.REDIS_URL });
    c.on("error", (err) => {
      console.warn("Redis error", err);
    });
    await c.connect();
    client = c;
  } catch (err) {
    console.warn("Redis unavailable, using in-memory store");
    client = null;
  }
  return client;
}

export async function saveSession(session: Session) {
  const data = JSON.stringify({
    sessionId: session.sessionId,
    userId: session.userId,
    roomId: session.roomId,
  });
  const c = await getClient();
  if (c) await c.set(`session:${session.sessionId}`, data);
  memorySessions.set(session.sessionId, JSON.parse(data));
}

export async function loadSession(id: string) {
  const c = await getClient();
  if (c) {
    const raw = await c.get(`session:${id}`);
    if (raw) return JSON.parse(raw) as Omit<Session, "socket" | "timeout">;
  }
  return memorySessions.get(id);
}

export async function removeSession(id: string) {
  const c = await getClient();
  if (c) await c.del(`session:${id}`);
  memorySessions.delete(id);
}

export async function saveRoom(room: GameRoom) {
  const c = await getClient();
  if (c) await c.set(`room:${room.id}`, JSON.stringify(room));
  memoryRooms.set(room.id, room);
}

export async function loadRoom(id: string) {
  const c = await getClient();
  if (c) {
    const raw = await c.get(`room:${id}`);
    if (raw) return JSON.parse(raw) as GameRoom;
  }
  return memoryRooms.get(id);
}

export async function loadAllRooms(): Promise<GameRoom[]> {
  const c = await getClient();
  if (c) {
    const keys = await c.keys("room:*");
    const rooms: GameRoom[] = [];
    for (const key of keys) {
      const raw = await c.get(key);
      if (raw) rooms.push(JSON.parse(raw));
    }
    return rooms;
  }
  return Array.from(memoryRooms.values());
}
