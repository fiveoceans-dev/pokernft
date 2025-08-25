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
import {
  listTables,
  registerTable,
  getEngine as getRegisteredEngine,
} from "./lobby";
import { randomUUID } from "crypto";
import { SessionManager, Session } from "./sessionManager";
import { shortAddress } from "../utils/address";
import {
  saveSession,
  removeSession,
  saveRoom,
  loadAllRooms,
  loadSession,
} from "./persistence";

const wss = new WebSocketServer({ port: 8080 });
const sessions = new SessionManager();
const processed = new Map<WebSocket, Set<string>>();
const tables = new Map<string, Table>();
const seating = new Map<string, SeatingManager>();
const seatMaps = new Map<string, Map<string, number>>();

(async () => {
  const rooms = await loadAllRooms();
  rooms.forEach((r) => getEngine(r.id, r));
})();

function getEngine(id: string, snapshot?: GameRoom): GameEngine {
  let engine = getRegisteredEngine(id);
  if (!engine) {
    engine = new GameEngine(id);
    if (snapshot) {
      engine.loadState(snapshot);
    }
    registerTable(id, engine);

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
    const mgr = new SeatingManager(table);
    seating.set(id, mgr);
    const seatMap = new Map<string, number>();
    seatMaps.set(id, seatMap);
    if (snapshot) {
      snapshot.players.forEach((p) => {
        const seated = mgr.seatPlayer(p.seat, p.id, p.chips);
        if (seated) seatMap.set(p.id, p.seat);
      });
    }

    let prevStage: Stage = engine.getState().stage;

    engine.on("stateChanged", (room: GameRoom) => {
      void saveRoom(room);
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

    engine.on("turnChanged", (turnInfo: any) => {
      broadcast(id, {
        type: "ACTION_PROMPT",
        actingIndex: turnInfo.actingIndex,
        betToCall: turnInfo.betToCall,
        minRaise: turnInfo.minRaise,
        timeLeftMs: turnInfo.timeLeftMs,
      });
    });
  }
  return engine;
}

function getRoom(id: string): GameRoom {
  return getEngine(id).getState();
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
  let session = sessions.create(ws);
  void saveSession(session);
  ws.send(
    JSON.stringify({
      tableId: "",
      type: "SESSION",
      sessionId: session.sessionId,
      userId: session.userId,
    } satisfies ServerEvent),
  );

  ws.on("message", async (data) => {
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
        case "LIST_TABLES": {
          ws.send(
            JSON.stringify({
              tableId: "",
              type: "TABLE_LIST",
              tables: listTables(),
            } satisfies ServerEvent),
          );
          break;
        }
        case "CREATE_TABLE": {
          const id = randomUUID();
          const engine = getEngine(id);
          registerTable(id, engine, msg.name);
          ws.send(
            JSON.stringify({
              tableId: id,
              type: "TABLE_CREATED",
              table: { id, name: msg.name },
            } satisfies ServerEvent),
          );
          break;
        }
        case "REATTACH": {
          let existing = sessions.getBySessionId(msg.sessionId);
          if (!existing) {
            const data = await loadSession(msg.sessionId);
            if (data) {
              existing = sessions.restore(data, ws);
            }
          }
          if (existing) {
            const hadTimeout = existing.timeout !== undefined;
            sessions.handleReconnect(existing);
            sessions.expire(session);
            sessions.replaceSocket(existing, ws);
            session = existing;
            void saveSession(existing);
            ws.send(
              JSON.stringify({
                tableId: existing.roomId ?? "",
                type: "SESSION",
                sessionId: existing.sessionId,
                userId: existing.userId,
              } satisfies ServerEvent),
            );
            if (existing.roomId) {
              const engine = getEngine(existing.roomId);
              const room = engine.getState();
              if (hadTimeout) {
                const playerId = existing.userId ?? existing.sessionId;
                const map = seatMaps.get(room.id);
                const seatIndex = map?.get(playerId);
                if (seatIndex !== undefined) {
                  broadcast(room.id, {
                    type: "PLAYER_REJOINED",
                    seat: seatIndex,
                    playerId,
                  });
                }
              }
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
        case "ATTACH": {
          const attached = sessions.attach(ws, msg.userId);
          if (attached) {
            const hadTimeout = attached.timeout !== undefined;
            session.userId = attached.userId;
            session.roomId = attached.roomId;
            sessions.handleReconnect(attached);
            void saveSession(session);
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
              if (hadTimeout) {
                const playerId = attached.userId ?? attached.sessionId;
                const map = seatMaps.get(room.id);
                const seatIndex = map?.get(playerId);
                if (seatIndex !== undefined) {
                  broadcast(room.id, {
                    type: "PLAYER_REJOINED",
                    seat: seatIndex,
                    playerId,
                  });
                }
              }
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "TABLE_SNAPSHOT",
                  table: room,
                } satisfies ServerEvent),
              );
              void saveRoom(room);
            }
          }
          break;
        }
        case "SIT": {
          const engine = getEngine(msg.tableId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const nickname = shortAddress(playerId);
          const seatIndex = msg.seat;
          if (seatIndex === undefined) break;
          
          const seatingMgr = seating.get(room.id);
          const table = tables.get(room.id);
          
          // Validate seat availability and buy-in using SeatingManager
          if (seatingMgr && table) {
            if (seatIndex < 0 || seatIndex >= table.seats.length) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "INVALID_SEAT",
                  msg: "Invalid seat index",
                } satisfies ServerEvent),
              );
              break;
            }
            if (table.seats[seatIndex]) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "SEAT_TAKEN",
                  msg: "Seat already taken",
                } satisfies ServerEvent),
              );
              break;
            }
            if (msg.buyIn < table.minBuyIn || msg.buyIn > table.maxBuyIn) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "INVALID_BUYIN",
                  msg: `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`,
                } satisfies ServerEvent),
              );
              break;
            }
            
            // Use SeatingManager to seat the player in the Table
            const tablePlayer = seatingMgr.seatPlayer(seatIndex, playerId, msg.buyIn);
            if (!tablePlayer) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "SEATING_FAILED",
                  msg: "Failed to take seat",
                } satisfies ServerEvent),
              );
              break;
            }
          }
          
          // Add player to GameEngine
          engine.addPlayer({
            id: playerId,
            nickname,
            seat: seatIndex,
            chips: msg.buyIn,
          });
          seatMaps.get(room.id)?.set(playerId, seatIndex);
          session.roomId = room.id;
          void saveSession(session);
          broadcast(room.id, {
            type: "PLAYER_JOINED",
            seat: seatIndex,
            playerId,
          });
          if (room.players.length >= 2 && room.stage === "waiting") {
            engine.startHand();
            broadcast(room.id, { type: "HAND_START" });
          }
          void saveRoom(room);
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "LEAVE": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          
          // Remove from SeatingManager
          const seatingMgr = seating.get(room.id);
          if (seatingMgr && seatIndex !== undefined) {
            seatingMgr.leave(seatIndex);
          }
          
          // Remove from GameEngine
          if (engine.removePlayer(playerId)) {
            seatMaps.get(room.id)?.delete(playerId);
            if (seatIndex !== undefined) {
              broadcast(room.id, {
                type: "PLAYER_LEFT",
                seat: seatIndex,
                playerId,
              });
            }
          }
          session.roomId = undefined;
          void saveSession(session);
          void saveRoom(room);
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "ACTION": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const action: PlayerAction = msg.action.toUpperCase() as PlayerAction;
          
          try {
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
          } catch (error) {
            ws.send(
              JSON.stringify({
                tableId: room.id,
                type: "ERROR",
                code: "ACTION_FAILED",
                msg: String(error),
              } satisfies ServerEvent),
            );
          }
          break;
        }
        case "REBUY": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          const seatingMgr = seating.get(room.id);
          
          // Update SeatingManager
          if (seatingMgr && seatIndex !== undefined) {
            if (!seatingMgr.topUp(seatIndex, msg.amount)) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "REBUY_FAILED",
                  msg: "Invalid rebuy amount or exceeds table maximum",
                } satisfies ServerEvent),
              );
              break;
            }
          }
          
          // Update GameEngine
          const player = room.players.find((p) => p.id === playerId);
          if (player) player.chips += msg.amount;
          
          void saveRoom(room);
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "SIT_OUT":
        case "SIT_IN": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          const seatingMgr = seating.get(room.id);
          
          if (seatingMgr && seatIndex !== undefined) {
            if (msg.type === "SIT_OUT") {
              seatingMgr.sitOut(seatIndex);
            } else {
              seatingMgr.sitIn(seatIndex);
            }
          }
          
          void saveRoom(room);
          broadcast(room.id, { type: "TABLE_SNAPSHOT", table: room });
          break;
        }
        case "POST_BLIND": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          broadcast(room.id, { type: "BLINDS_POSTED" });
          void saveRoom(room);
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
      const playerId = s.userId ?? s.sessionId;
      const seatIndex = seatMaps.get(s.roomId)?.get(playerId);
      if (seatIndex !== undefined) {
        broadcast(s.roomId, {
          type: "PLAYER_DISCONNECTED",
          seat: seatIndex,
          playerId,
        });
      }
      // Note: Don't immediately remove from engine - handled by timeout in SessionManager
    });
  });
});

console.log("WebSocket server running on ws://localhost:8080");
