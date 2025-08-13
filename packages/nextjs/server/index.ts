import { WebSocketServer, WebSocket } from "ws";
import {
  createRoom,
  addPlayer,
  handleAction,
  startHand,
  type GameRoom,
  type ServerEvent,
  type ClientCommand,
} from "../backend";

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}..${addr.slice(-4)}`;
}

const wss = new WebSocketServer({ port: 8080 });
const room: GameRoom = createRoom("default");
const clients = new Map<WebSocket, string>();
const processedCmdIds = new Set<string>();

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const cmd = JSON.parse(data.toString()) as ClientCommand;
      if (processedCmdIds.has(cmd.cmdId)) {
        ws.send(
          JSON.stringify({
            type: "TABLE_SNAPSHOT",
            table: room,
          } as ServerEvent),
        );
        return;
      }
      processedCmdIds.add(cmd.cmdId);
      switch (cmd.type) {
        case "SIT": {
          const { playerId, nickname, buyIn } = cmd;
          addPlayer(room, {
            id: playerId,
            nickname,
            seat: room.players.length,
            chips: buyIn,
          });
          clients.set(ws, playerId);
          broadcast({ type: "TABLE_SNAPSHOT", table: room } as ServerEvent);
          break;
        }
        case "START_HAND": {
          startHand(room);
          broadcast({ type: "HAND_START" } as ServerEvent);
          broadcast({ type: "TABLE_SNAPSHOT", table: room } as ServerEvent);
          break;
        }
        case "ACTION": {
          handleAction(room, cmd.playerId, cmd.action);
          const seatIndex = room.players.findIndex(
            (p) => p.id === cmd.playerId,
          );
          broadcast({
            type: "PLAYER_ACTION_APPLIED",
            seatIndex,
            action: cmd.action.type,
            amount: cmd.action.amount ?? 0,
          } as ServerEvent);
          broadcast({ type: "TABLE_SNAPSHOT", table: room } as ServerEvent);
          break;
        }
        default: {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              code: "UNSUPPORTED_CMD",
              msg: cmd.type,
            } as ServerEvent),
          );
        }
      }
    } catch (err) {
      console.error("invalid message", err);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          code: "BAD_JSON",
          msg: String(err),
        } as ServerEvent),
      );
    }
  });

  ws.on("close", () => {
    const id = clients.get(ws);
    if (!id) return;
    const idx = room.players.findIndex((p) => p.id === id);
    if (idx !== -1) room.players.splice(idx, 1);
    clients.delete(ws);
    broadcast({ type: "TABLE_SNAPSHOT", table: room } as ServerEvent);
  });
});

console.log("WebSocket server running on ws://localhost:8080");
