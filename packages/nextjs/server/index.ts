import { WebSocketServer, WebSocket } from "ws";
import { GameEngine, SeatingManager, TableState, Round } from "../backend";
import type {
  GameRoom,
  ServerEvent,
  ClientCommand,
  PlayerAction,
  Stage,
  Table,
} from "../backend";
import { SessionManager, Session } from "./sessionManager";
import { shortAddress } from "../utils/address";

const wss = new WebSocketServer({ port: 8080 });
const sessions = new SessionManager();
const engines = new Map<string, GameEngine>();
const processed = new Map<WebSocket, Set<string>>();
const tables = new Map<string, Table>();
const seating = new Map<string, SeatingManager>();
const seatMaps = new Map<string, Map<string, number>>();

function getEngine(id: string): GameEngine {
  let engine = engines.get(id);
  if (!engine) {
    engine = new GameEngine(id);
    engines.set(id, engine);

    const table: Table = {
      seats: Array(6).fill(null),
      buttonIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 0,
      smallBlindAmount: engine.getState().minBet / 2,
      bigBlindAmount: engine.getState().minBet,
      minBuyIn: engine.getState().minBet,
      maxBuyIn: engine.getState().minBet * 100,
      state: TableState.WAITING,
      deck: [],
      board: [],
      pots: [],
      currentRound: Round.PREFLOP,
      actingIndex: null,
      betToCall: 0,
      minRaise: engine.getState().minBet,
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      dealAnimationDelayMs: 0,
    };
    tables.set(id, table);
    seating.set(id, new SeatingManager(table));
    seatMaps.set(id, new Map());

    let prevStage: Stage = engine.getState().stage;

    engine.on("stateChanged", (room: GameRoom) => {
      broadcast(id, { type: "TABLE_SNAPSHOT", table: room });
    });

    engine.on("stageChanged", (stage: Stage) => {
      const room = engine!.getState();
      const stageToRound: Record<Stage, Round | null> = {
        waiting: null,
        preflop: Round.PREFLOP,
        flop: Round.FLOP,
        turn: Round.TURN,
        river: Round.RIVER,
        showdown: null,
      };
      const street = stageToRound[prevStage];
      if (street) {
        broadcast(id, { type: "ROUND_END", street });
      }

      if (stage === "flop") {
        broadcast(id, {
          type: "DEAL_FLOP",
          cards: [
            room.communityCards[0],
            room.communityCards[1],
            room.communityCards[2],
          ],
        });
      } else if (stage === "turn") {
        broadcast(id, {
          type: "DEAL_TURN",
          card: room.communityCards[3],
        });
      } else if (stage === "river") {
        broadcast(id, {
          type: "DEAL_RIVER",
          card: room.communityCards[4],
        });
      }

      prevStage = stage;
    });

    engine.on("handEnded", () => {
      broadcast(id, { type: "HAND_END" });
    });
  }
  return engine;
}

function broadcast(roomId: string, event: Omit<ServerEvent, "tableId">) {
  const msg = JSON.stringify({ tableId: roomId, ...event });
  wss.clients.forEach((client) => {
    const session = sessions.get(client as WebSocket);
    if (session?.roomId === roomId && client.readyState === WebSocket.OPEN) {
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
          const engine = getEngine(session.roomId);
          const room = engine.getState();
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
              const engine = getEngine(attached.roomId);
              const room = engine.getState();
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
          const engine = getEngine(msg.tableId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const table = tables.get(room.id)!;
          const mgr = seating.get(room.id)!;
          const map = seatMaps.get(room.id)!;
          if (map.has(playerId) || table.seats.some((p) => p?.id === playerId)) {
            break;
          }
          const seatIndex = table.seats.findIndex((p) => p === null);
          if (seatIndex === -1) break;
          const seated = mgr.seatPlayer(seatIndex, playerId, msg.buyIn);
          if (!seated) break;
          map.set(playerId, seatIndex);
          const nickname = shortAddress(playerId);
          engine.addPlayer({
            id: playerId,
            nickname,
            seat: seatIndex,
            chips: msg.buyIn,
          });
          session.roomId = room.id;
          if (room.players.length >= 2 && room.stage === "waiting") {
            engine.startHand();
            broadcast(room.id, { type: "HAND_START" });
          }
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "LEAVE": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const map = seatMaps.get(room.id);
          const mgr = seating.get(room.id);
          const seatIndex = map?.get(playerId);
          if (seatIndex !== undefined) {
            mgr?.leave(seatIndex);
            map?.delete(playerId);
          }
          const idx = room.players.findIndex((p) => p.id === playerId);
          if (idx !== -1) room.players.splice(idx, 1);
          session.roomId = undefined;
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "ACTION": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const action: PlayerAction = msg.action.toUpperCase() as PlayerAction;
          engine.handleAction(playerId, {
            type: action.toLowerCase() as any,
            amount: msg.amount,
          });
          broadcast(room.id, {
            type: "PLAYER_ACTION_APPLIED",
            playerId,
            action,
            amount: msg.amount,
          });
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
          break;
        }
        case "REBUY": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const player = room.players.find((p) => p.id === playerId);
          if (player) player.chips += msg.amount;
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "SIT_OUT":
        case "SIT_IN": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "POST_BLIND": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          broadcast(room.id, { type: "BLINDS_POSTED" });
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        default: {
          const tableId =
            session.roomId ?? ("tableId" in msg ? (msg as any).tableId : "");
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
      const engine = getEngine(s.roomId);
      const room = engine.getState();
      const playerId = s.userId ?? s.sessionId;
      const map = seatMaps.get(room.id);
      const mgr = seating.get(room.id);
      const seatIndex = map?.get(playerId);
      if (seatIndex !== undefined) {
        mgr?.leave(seatIndex);
        map?.delete(playerId);
      }
      const idx = room.players.findIndex((p) => p.id === playerId);
      if (idx !== -1) room.players.splice(idx, 1);
      broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
    });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
