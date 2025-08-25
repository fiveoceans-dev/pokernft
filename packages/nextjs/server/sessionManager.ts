import { randomBytes } from "crypto";
import type { WebSocket } from "ws";

export interface Session {
  /** Unique identifier for this websocket connection */
  sessionId: string;
  socket: WebSocket;
  /** Persistent user identifier (wallet address) if attached */
  userId?: string;
  roomId?: string;
  timeout?: NodeJS.Timeout;
}

/** Generate a Starknet-style address */
export function createAddress(): string {
  return "0x" + randomBytes(20).toString("hex");
}

/** Simple in-memory session registry */
export class SessionManager {
  private sessions = new Map<WebSocket, Session>();
  private bySessionId = new Map<string, Session>();
  private byUserId = new Map<string, Session>();
  constructor(private disconnectGraceMs = 5000) {}
  create(ws: WebSocket): Session {
    const sessionId = createAddress();
    const session: Session = { sessionId, socket: ws };
    this.sessions.set(ws, session);
    this.bySessionId.set(sessionId, session);
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
    }
  }

  replaceSocket(session: Session, ws: WebSocket) {
    this.sessions.delete(session.socket);
    session.socket = ws;
    this.sessions.set(ws, session);
  }

  /** Restore a session from persisted data */
  restore(
    data: { sessionId: string; userId?: string; roomId?: string },
    ws: WebSocket,
  ): Session {
    const session: Session = {
      sessionId: data.sessionId,
      userId: data.userId,
      roomId: data.roomId,
      socket: ws,
    };
    this.sessions.set(ws, session);
    this.bySessionId.set(session.sessionId, session);
    if (session.userId) {
      this.byUserId.set(session.userId, session);
    }
    return session;
  }

  private clearTimer(session: Session) {
    if (session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = undefined;
    }
  }
}
