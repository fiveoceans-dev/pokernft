import { WebSocketServer, WebSocket } from "ws";
import { createRoom, addPlayer, handleAction, startHand } from "../backend";
import type {
  GameRoom,
  ServerEvent,
  ClientCommand,
  PlayerAction,
} from "../backend";

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}..${addr.slice(-4)}`;
}

const wss = new WebSocketServer({ port: 8080 });
const room: GameRoom = createRoom("default");
const clients = new Map<WebSocket, string>();
const processed = new Map<WebSocket, Set<string>>();

function broadcast(event: ServerEvent) {
  const msg = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
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
        ws.send(
          JSON.stringify({
            type: "TABLE_SNAPSHOT",
            table: room,
          } satisfies ServerEvent),
        );
        return;
      }
      set.add(msg.cmdId);
      switch (msg.type) {
        case "SIT": {
          const id = clients.get(ws) ?? msg.cmdId;
          const nickname = shortAddress(id);
          addPlayer(room, {
            id,
            nickname,
            seat: room.players.length,
            chips: msg.buyIn,
          });
          clients.set(ws, id);
          if (room.players.length >= 2 && room.stage === "waiting") {
            startHand(room);
            broadcast({ type: "HAND_START" });
          }
          broadcast({ type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "LEAVE": {
          const id = clients.get(ws);
          if (id) {
            const idx = room.players.findIndex((p) => p.id === id);
            if (idx !== -1) room.players.splice(idx, 1);
            clients.delete(ws);
            broadcast({ type: "TABLE_SNAPSHOT", table: room });
          }
          break;
        }
        case "ACTION": {
          const playerId = clients.get(ws);
          if (!playerId) break;
          const action: PlayerAction = msg.action.toUpperCase() as PlayerAction;
          handleAction(room, playerId, {
            type: action.toLowerCase() as any,
            amount: msg.amount,
          });
          broadcast({
            type: "PLAYER_ACTION_APPLIED",
            playerId,
            action,
            amount: msg.amount,
          });
          broadcast({ type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "REBUY": {
          const playerId = clients.get(ws);
          if (!playerId) break;
          const player = room.players.find((p) => p.id === playerId);
          if (player) player.chips += msg.amount;
          broadcast({ type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "SIT_OUT":
        case "SIT_IN":
        case "POST_BLIND":
          ws.send(
            JSON.stringify({
              type: "ERROR",
              code: "UNSUPPORTED",
              msg: msg.type,
            } satisfies ServerEvent),
          );
          break;
        default:
          ws.send(
            JSON.stringify({
              type: "ERROR",
              code: "UNKNOWN_COMMAND",
              msg: msg.type,
            } satisfies ServerEvent),
          );
      }
    } catch (err) {
      console.error("invalid message", err);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          code: "BAD_JSON",
          msg: String(err),
        } satisfies ServerEvent),
      );
    }
  });

  ws.on("close", () => {
    const id = clients.get(ws);
    if (!id) return;
    const idx = room.players.findIndex((p) => p.id === id);
    if (idx !== -1) room.players.splice(idx, 1);
    clients.delete(ws);
    broadcast({ type: "TABLE_SNAPSHOT", table: room });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
