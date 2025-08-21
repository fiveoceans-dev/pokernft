import { WebSocketServer, WebSocket } from "ws";
import { createRoom, addPlayer, handleAction, startHand } from "../backend";
import type {
  GameRoom,
  ServerEvent,
  ClientCommand,
  PlayerAction,
} from "../backend";
import { SessionManager, Session } from "./sessionManager";

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}..${addr.slice(-4)}`;
}

const wss = new WebSocketServer({ port: 8080 });
const sessions = new SessionManager();
const rooms = new Map<string, GameRoom>();
const processed = new Map<WebSocket, Set<string>>();

function getRoom(id: string): GameRoom {
  let room = rooms.get(id);
  if (!room) {
    room = createRoom(id);
    rooms.set(id, room);
  }
  return room;
}

function broadcast(roomId: string, event: Omit<ServerEvent, "tableId">) {
  const msg = JSON.stringify({ tableId: roomId, ...event });
  wss.clients.forEach((client) => {
    const session = sessions.get(client as WebSocket);
    if (
      session?.roomId === roomId &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  const session = sessions.create(ws);
  ws.send(
    JSON.stringify({
      tableId: "",
      type: "SESSION",
      userId: session.id,
    } satisfies ServerEvent),
  );

  ws.on("message", (data) => {
    try {
      const msg: ClientCommand = JSON.parse(data.toString());
      if (!msg.cmdId) return;
      let set = processed.get(ws);
      if (!set) {
        set = new Set();
        processed.set(ws, set);
      }
      if (set.has(msg.cmdId)) {
        if (session.roomId) {
          const room = getRoom(session.roomId);
          ws.send(
            JSON.stringify({
              tableId: room.id,
              type: "TABLE_SNAPSHOT",
              table: room,
            } satisfies ServerEvent),
          );
        }
        return;
      }
      set.add(msg.cmdId);

      switch (msg.type) {
        case "SIT": {
          const room = getRoom(msg.tableId);
          const nickname = shortAddress(session.id);
          addPlayer(room, {
            id: session.id,
            nickname,
            seat: room.players.length,
            chips: msg.buyIn,
          });
          session.roomId = room.id;
          if (room.players.length >= 2 && room.stage === "waiting") {
            startHand(room);
            broadcast(room.id, { type: "HAND_START" });
          }
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "LEAVE": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const idx = room.players.findIndex((p) => p.id === session.id);
          if (idx !== -1) room.players.splice(idx, 1);
          session.roomId = undefined;
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "ACTION": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const action: PlayerAction = msg.action.toUpperCase() as PlayerAction;
          handleAction(room, session.id, {
            type: action.toLowerCase() as any,
            amount: msg.amount,
          });
          broadcast(room.id, {
            type: "PLAYER_ACTION_APPLIED",
            playerId: session.id,
            action,
            amount: msg.amount,
          });
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "REBUY": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const player = room.players.find((p) => p.id === session.id);
          if (player) player.chips += msg.amount;
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "SIT_OUT":
        case "SIT_IN": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "POST_BLIND": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          broadcast(room.id, { type: "BLINDS_POSTED" });
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        default: {
          const tableId = session.roomId ?? ("tableId" in msg ? (msg as any).tableId : "");
          ws.send(
            JSON.stringify({
              tableId,
              type: "ERROR",
              code: "UNKNOWN_COMMAND",
              msg: (msg as any).type,
            } satisfies ServerEvent),
          );
        }
      }
    } catch (err) {
      console.error("invalid message", err);
      ws.send(
        JSON.stringify({
          tableId: session.roomId || "",
          type: "ERROR",
          code: "BAD_JSON",
          msg: String(err),
        } satisfies ServerEvent),
      );
    }
  });

  ws.on("close", () => {
    sessions.handleDisconnect(session, (s: Session) => {
      if (!s.roomId) return;
      const room = getRoom(s.roomId);
      const idx = room.players.findIndex((p) => p.id === s.id);
      if (idx !== -1) room.players.splice(idx, 1);
      broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
    });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
