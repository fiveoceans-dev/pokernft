import { randomBytes } from "crypto";
import type { WebSocket } from "ws";
import { logger } from "../game-engine/utils/logger";

type RedisClientType = import("redis").RedisClientType;

let client: RedisClientType | null;
let redisConnectionAttempted = false;

async function getClient(): Promise<RedisClientType | null> {
  if (client !== undefined) return client;
  if (!redisConnectionAttempted) {
    redisConnectionAttempted = true;
    try {
      const mod = await import("redis");
      const c = mod.createClient({ url: process.env.REDIS_URL });

      let errorCount = 0;
      c.on("error", () => {
        errorCount++;
        if (errorCount === 1) {
          logger.warn("📡 Redis connection failed, using in-memory sessions");
        }
      });

      await c.connect();
      logger.info("📡 Redis connected for sessions");
      client = c as any;
    } catch {
      logger.warn("📡 Redis unavailable, using in-memory sessions");
      client = null;
    }
  }
  return client;
}

export interface Session {
  /** Unique identifier for this websocket connection */
  sessionId: string;
  socket: WebSocket;
  /** Persistent user identifier (wallet address) if attached */
  userId?: string;
  roomId?: string;
  /** Seat number (0-8) if player is seated at a table */
  seat?: number;
  /** Player's chip count */
  chips?: number;
  /** Player's nickname for display */
  nickname?: string;
  /** Whether player is currently in an active hand */
  inActiveHand?: boolean;
  timeout?: NodeJS.Timeout;
}

/** Generate a Starknet-style address */
export function createAddress(): string {
  return "0x" + randomBytes(20).toString("hex");
}

/** Redis-backed session registry with in-memory fallback */
export class SessionManager {
  private sessions = new Map<WebSocket, Session>();
  private bySessionId = new Map<string, Session>();
  private byUserId = new Map<string, Session>();
  private memoryStore = new Map<string, Omit<Session, "socket" | "timeout">>();

  constructor(private disconnectGraceMs = 5000) {}

  get getDisconnectGraceMs() {
    return this.disconnectGraceMs;
  }

  private async persist(session: Session) {
    const c = await getClient();
    const key = `session:${session.sessionId}`;
    const data: Record<string, string> = {
      sessionId: session.sessionId,
    };
    if (session.userId) data.userId = session.userId;
    if (session.roomId) data.roomId = session.roomId;
    if (session.seat !== undefined) data.seat = String(session.seat);
    if (c) {
      await c.hSet(key, data);
      if (session.userId)
        await c.set(`user:${session.userId}`, session.sessionId);
    }
    this.memoryStore.set(session.sessionId, {
      sessionId: session.sessionId,
      userId: session.userId,
      roomId: session.roomId,
      seat: session.seat,
      chips: session.chips,
      nickname: session.nickname,
      inActiveHand: session.inActiveHand,
    });
  }

  async save(session: Session) {
    await this.persist(session);
  }

  create(ws: WebSocket): Session {
    const sessionId = createAddress();
    const session: Session = { sessionId, socket: ws };
    this.sessions.set(ws, session);
    this.bySessionId.set(sessionId, session);
    void this.persist(session);
    return session;
  }

  get(ws: WebSocket): Session | undefined {
    return this.sessions.get(ws);
  }

  getByUserId(id: string): Session | undefined {
    return this.byUserId.get(id);
  }

  getBySessionId(id: string): Session | undefined {
    return this.bySessionId.get(id);
  }

  /** Prevent multiple logins with the same id */
  attach(ws: WebSocket, userId: string): Session | undefined {
    const existing = this.byUserId.get(userId);
    if (existing && existing.socket !== ws) return undefined;
    let session = this.sessions.get(ws);
    if (!session) {
      session = { sessionId: createAddress(), socket: ws };
      this.sessions.set(ws, session);
      this.bySessionId.set(session.sessionId, session);
    }
    session.userId = userId;
    this.byUserId.set(userId, session);
    void this.persist(session);
    return session;
  }

  handleDisconnect(session: Session, onDisconnect: (session: Session) => void) {
    this.clearTimer(session);
    onDisconnect(session);
    if (!session.timeout) {
      session.timeout = setTimeout(() => {
        this.expire(session);
      }, this.disconnectGraceMs);
    }
  }

  handleReconnect(session: Session) {
    this.clearTimer(session);
  }

  expire(session: Session) {
    this.sessions.delete(session.socket);
    this.bySessionId.delete(session.sessionId);
    if (session.userId) {
      this.byUserId.delete(session.userId);
      void (async () => {
        const c = await getClient();
        if (c) await c.del(`user:${session.userId}`);
      })();
    }
    void (async () => {
      const c = await getClient();
      if (c) await c.del(`session:${session.sessionId}`);
    })();
    this.memoryStore.delete(session.sessionId);
  }

  replaceSocket(session: Session, ws: WebSocket) {
    this.sessions.delete(session.socket);
    session.socket = ws;
    this.sessions.set(ws, session);
  }

  /**
   * Update user binding for existing session
   * Maintains consistency of byUserId mapping
   */
  updateBinding(session: Session, userId: string): boolean {
    const normalizedUserId = userId.toLowerCase().trim();

    const existingSession = this.byUserId.get(normalizedUserId);
    if (existingSession && existingSession !== session) {
      console.warn(
        `⚠️ [SessionManager] UserId ${normalizedUserId} already bound to different session`,
      );
      return false;
    }

    if (session.userId && session.userId !== normalizedUserId) {
      this.byUserId.delete(session.userId);
      void (async () => {
        const c = await getClient();
        if (c) await c.del(`user:${session.userId}`);
      })();
    }

    session.userId = normalizedUserId;
    this.byUserId.set(normalizedUserId, session);
    void this.persist(session);

    console.log(
      `✅ [SessionManager] Updated binding: session ${session.sessionId} -> userId ${normalizedUserId}`,
    );
    return true;
  }

  /** Restore a session from persistent storage */
  async restore(
    sessionId: string,
    ws: WebSocket,
  ): Promise<Session | undefined> {
    const c = await getClient();
    let data: any = null;
    if (c) {
      const raw = await c.hGetAll(`session:${sessionId}`);
      if (Object.keys(raw).length > 0) {
        data = {
          sessionId: raw.sessionId,
          userId: raw.userId,
          roomId: raw.roomId,
          seat: raw.seat ? Number(raw.seat) : undefined,
        };
      }
    }
    if (!data) {
      data = this.memoryStore.get(sessionId);
    }
    if (!data) return undefined;
    const session: Session = {
      sessionId: data.sessionId,
      userId: data.userId,
      roomId: data.roomId,
      seat: data.seat,
      socket: ws,
    };
    this.sessions.set(ws, session);
    this.bySessionId.set(session.sessionId, session);
    if (session.userId) this.byUserId.set(session.userId, session);
    return session;
  }

  private clearTimer(session: Session) {
    if (session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = undefined;
    }
  }
}
