import { WebSocketServer, WebSocket } from "ws";
import {
  createRoom,
  addPlayer,
  handleAction,
  startRoomHand,
  isRoomRoundComplete,
  progressStage,
} from "../backend";
import type {
  GameRoom,
  ServerEvent,
  ClientCommand,
  PlayerAction,
  Stage,
  Round,
} from "../backend";
import { SessionManager, Session } from "./sessionManager";
import { shortAddress } from "../utils/address";

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
      sessionId: session.sessionId,
      userId: session.userId,
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
        case "ATTACH": {
          const attached = sessions.attach(ws, msg.userId);
          if (attached) {
            session.userId = attached.userId;
            session.roomId = attached.roomId;
            ws.send(
              JSON.stringify({
                tableId: attached.roomId ?? "",
                type: "SESSION",
                sessionId: attached.sessionId,
                userId: attached.userId,
              } satisfies ServerEvent),
            );
            if (attached.roomId) {
              const room = getRoom(attached.roomId);
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "TABLE_SNAPSHOT",
                  table: room,
                } satisfies ServerEvent),
              );
            }
          }
          break;
        }
        case "SIT": {
          const room = getRoom(msg.tableId);
          const playerId = session.userId ?? session.sessionId;
          const nickname = shortAddress(playerId);
          addPlayer(room, {
            id: playerId,
            nickname,
            seat: room.players.length,
            chips: msg.buyIn,
          });
          session.roomId = room.id;
          if (room.players.length >= 2 && room.stage === "waiting") {
            startRoomHand(room);
            broadcast(room.id, { type: "HAND_START" });
          }
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "LEAVE": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const playerId = session.userId ?? session.sessionId;
          const idx = room.players.findIndex((p) => p.id === playerId);
          if (idx !== -1) room.players.splice(idx, 1);
          session.roomId = undefined;
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "ACTION": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const playerId = session.userId ?? session.sessionId;
          const action: PlayerAction = msg.action.toUpperCase() as PlayerAction;
          handleAction(room, playerId, {
            type: action.toLowerCase() as any,
            amount: msg.amount,
          });
          broadcast(room.id, {
            type: "PLAYER_ACTION_APPLIED",
            playerId,
            action,
            amount: msg.amount,
          });
          if (
            isRoomRoundComplete(room) &&
            room.stage !== "waiting" &&
            room.stage !== "showdown"
          ) {
            const stageToRound: Record<Stage, Round | null> = {
              waiting: null,
              preflop: Round.PREFLOP,
              flop: Round.FLOP,
              turn: Round.TURN,
              river: Round.RIVER,
              showdown: null,
            };
            const street = stageToRound[room.stage];
            if (street) {
              broadcast(room.id, { type: "ROUND_END", street });
            }
            progressStage(room);
            if (room.stage === "flop") {
              broadcast(room.id, {
                type: "DEAL_FLOP",
                cards: [
                  room.communityCards[0],
                  room.communityCards[1],
                  room.communityCards[2],
                ],
              });
            } else if (room.stage === "turn") {
              broadcast(room.id, {
                type: "DEAL_TURN",
                card: room.communityCards[3],
              });
            } else if (room.stage === "river") {
              broadcast(room.id, {
                type: "DEAL_RIVER",
                card: room.communityCards[4],
              });
            }
          }

          if (room.stage !== "waiting" && room.stage !== "showdown") {
            const acting = room.players[room.currentTurnIndex];
            if (acting) {
              const maxBet = Math.max(
                0,
                ...room.players.map((p) => p.currentBet),
              );
              const betToCall = Math.max(0, maxBet - acting.currentBet);
              broadcast(room.id, {
                type: "ACTION_PROMPT",
                actingIndex: room.currentTurnIndex,
                betToCall,
                minRaise: room.minBet,
                timeLeftMs: 0,
              });
            }
          }

          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "REBUY": {
          if (!session.roomId) break;
          const room = getRoom(session.roomId);
          const playerId = session.userId ?? session.sessionId;
          const player = room.players.find((p) => p.id === playerId);
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
      const playerId = s.userId ?? s.sessionId;
      const idx = room.players.findIndex((p) => p.id === playerId);
      if (idx !== -1) room.players.splice(idx, 1);
      broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
    });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
