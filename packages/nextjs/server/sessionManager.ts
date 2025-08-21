import { randomBytes } from "crypto";
import type { WebSocket } from "ws";

export interface Session {
  id: string;
  socket: WebSocket;
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
  private byId = new Map<string, Session>();
  constructor(private disconnectGraceMs = 5000) {}

  create(ws: WebSocket): Session {
    const id = createAddress();
    const session: Session = { id, socket: ws };
    this.sessions.set(ws, session);
    this.byId.set(id, session);
    return session;
  }

  get(ws: WebSocket): Session | undefined {
    return this.sessions.get(ws);
  }

  /** Prevent multiple logins with the same id */
  attach(ws: WebSocket, id: string): Session | undefined {
    const existing = this.byId.get(id);
    if (existing && existing.socket !== ws) return undefined;
    const session: Session = { id, socket: ws };
    this.sessions.set(ws, session);
    this.byId.set(id, session);
    return session;
  }

  handleDisconnect(session: Session, onExpire: (session: Session) => void) {
    this.clearTimer(session);
    session.timeout = setTimeout(() => {
      this.sessions.delete(session.socket);
      this.byId.delete(session.id);
      onExpire(session);
    }, this.disconnectGraceMs);
  }

  handleReconnect(session: Session) {
    this.clearTimer(session);
  }

  private clearTimer(session: Session) {
    if (session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = undefined;
    }
  }
}
