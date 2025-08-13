import { WebSocketServer, WebSocket } from "ws";
import { createRoom, addPlayer, handleAction, startHand } from "../backend";
import type { GameRoom } from "../backend";

function shortAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}..${addr.slice(-4)}`;
}

const wss = new WebSocketServer({ port: 8080 });
const room: GameRoom = createRoom("default");
const clients = new Map<WebSocket, string>();

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      switch (msg.type) {
        case "join": {
          const address: string = msg.address;
          const id = address;
          const nickname = shortAddress(address);
          addPlayer(room, {
            id,
            nickname,
            seat: room.players.length,
            chips: 1000,
          });
          clients.set(ws, id);
          broadcast({
            type: "players",
            players: room.players.map((p) => ({
              id: p.id,
              nickname: p.nickname,
            })),
          });
          break;
        }
        case "start": {
          startHand(room);
          broadcast({ type: "state", room });
          break;
        }
        case "action": {
          handleAction(room, msg.playerId, msg.action);
          broadcast({ type: "state", room });
          break;
        }
      }
    } catch (err) {
      console.error("invalid message", err);
    }
  });

  ws.on("close", () => {
    const id = clients.get(ws);
    if (!id) return;
    const idx = room.players.findIndex((p) => p.id === id);
    if (idx !== -1) room.players.splice(idx, 1);
    clients.delete(ws);
    broadcast({
      type: "players",
      players: room.players.map((p) => ({ id: p.id, nickname: p.nickname })),
    });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
