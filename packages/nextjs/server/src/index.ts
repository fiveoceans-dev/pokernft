import { WebSocketServer, WebSocket } from "ws";
import { GameEngine, SeatingManager, TableState, Round } from "../game-engine";
import type {
  GameRoom,
  ServerEvent,
  ClientCommand,
  PlayerAction,
  Stage,
  Table,
} from "../game-engine";
import {
  listTables,
  registerTable,
  getEngine as getRegisteredEngine,
} from "./lobby";
import { randomUUID } from "crypto";
import { SessionManager, Session } from "./sessionManager";
import { shortAddress } from "./utils";
import {
  saveSession,
  removeSession,
  saveRoom,
  loadAllRooms,
  loadSession,
} from "./persistence";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const wss = new WebSocketServer({ port: PORT });
const sessions = new SessionManager();
const processed = new Map<WebSocket, Set<string>>();

// Track connection count for logging
let connectionCount = 0;
const tables = new Map<string, Table>();
const seating = new Map<string, SeatingManager>();
const seatMaps = new Map<string, Map<string, number>>();
const gameStartTimers = new Map<string, NodeJS.Timeout>();
const actionTimers = new Map<string, NodeJS.Timeout>();

// Initialize tables immediately without waiting for persistence layer
console.log('🌌 Creating persistent tables...');
ensurePersistentTables();

// Load persisted rooms in background (don't block server startup)
(async () => {
  try {
    console.log('📂 Loading persisted rooms from storage...');
    const rooms = await loadAllRooms();
    console.log(`📂 Loaded ${rooms.length} persisted rooms`);
    rooms.forEach((r) => {
      console.log(`🎲 Restoring room: ${r.id} with ${r.players.length} players`);
      getEngine(r.id, r);
    });
    console.log('✅ Room restoration completed');
  } catch (error) {
    console.error('❌ Room restoration failed:', error);
    console.log('ℹ️  Continuing with default tables only');
  }
})();

function ensurePersistentTables() {
  const persistentTables = [
    { id: "andromeda", name: "🌌 Andromeda Station", blinds: { small: 25, big: 50 } },
    { id: "orion", name: "🚀 Orion Outpost", blinds: { small: 50, big: 100 } }
  ];

  persistentTables.forEach(({ id, name, blinds }) => {
    let engine = getRegisteredEngine(id);
    if (!engine) {
      console.log(`🎲 Creating persistent table: ${name} (${id}) with blinds ${blinds.small}/${blinds.big}`);
      // Create the engine and register it properly by calling the local getEngine function
      // This will ensure the table is set up with all necessary maps and event handlers
      engine = getEngine(id);
      registerTable(id, engine, name);
      console.log(`✅ Table ${name} created and registered`);
    } else {
      console.log(`🔄 Table ${name} (${id}) already exists`);
    }

    // Update engine and table with correct blind and buy-in values
    const room = engine.getState();
    room.minBet = blinds.big;
    const table = tables.get(id);
    if (table) {
      table.smallBlindAmount = blinds.small;
      table.bigBlindAmount = blinds.big;
      table.minBuyIn = blinds.big;
      table.maxBuyIn = blinds.big * 100;
      table.minRaise = blinds.big;
    }
  });
  
  console.log(`🎯 Total tables available: ${listTables().length}`);
}

function getEngine(id: string, snapshot?: GameRoom): GameEngine {
  let engine = getRegisteredEngine(id);
  if (!engine) {
    engine = new GameEngine(id);
    if (snapshot) {
      engine.loadState(snapshot);
    }
    registerTable(id, engine);

    const table: Table = {
      seats: Array(9).fill(null),
      buttonIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 0,
      smallBlindAmount: engine.getState().minBet / 2,
      bigBlindAmount: engine.getState().minBet,
      minBuyIn: engine.getState().minBet,
      maxBuyIn: engine.getState().minBet * 100,
      state: "WAITING" as any, // TableState.WAITING
      deck: [],
      board: [],
      pots: [],
      currentRound: "PREFLOP" as any, // Round.PREFLOP
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
    console.log(`🪑 Created table ${id} with ${table.seats.length} seats and seating manager`);
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
        preflop: "PREFLOP" as any, // Round.PREFLOP
        flop: "FLOP" as any, // Round.FLOP
        turn: "TURN" as any, // Round.TURN
        river: "RIVER" as any, // Round.RIVER
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
      
      // Start action timer for the current player
      startActionTimer(id, turnInfo.playerId);
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

function startGameCountdown(roomId: string) {
  // Clear existing timer
  const existingTimer = gameStartTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  let countdown = 10;
  broadcast(roomId, { type: "GAME_START_COUNTDOWN", countdown });

  const timer = setInterval(() => {
    countdown--;
    broadcast(roomId, { type: "GAME_START_COUNTDOWN", countdown });

    if (countdown <= 0) {
      clearInterval(timer);
      gameStartTimers.delete(roomId);
      
      // Start the hand
      const engine = getEngine(roomId);
      const room = engine.getState();
      if (room.players.length >= 2 && room.stage === "waiting") {
        engine.startHand();
        broadcast(roomId, { type: "HAND_START" });
      }
    }
  }, 1000);

  gameStartTimers.set(roomId, timer);
}

function startActionTimer(roomId: string, playerId: string) {
  // Clear existing timer
  const existingTimer = actionTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  let countdown = 10;
  broadcast(roomId, { type: "ACTION_TIMEOUT", countdown });

  const timer = setInterval(() => {
    countdown--;
    broadcast(roomId, { type: "ACTION_TIMEOUT", countdown });

    if (countdown <= 0) {
      clearInterval(timer);
      actionTimers.delete(roomId);
      
      // Auto-action (fold or check based on rules)
      const engine = getEngine(roomId);
      const room = engine.getState();
      const player = room.players.find(p => p.id === playerId);
      
      if (player && player.isTurn) {
        const maxBet = Math.max(0, ...room.players.map((p) => p.currentBet));
        const betToCall = maxBet - player.currentBet;
        
        // If no bet to call, check; otherwise fold
        const autoAction = betToCall === 0 ? "check" : "fold";
        
        try {
          engine.handleAction(playerId, { type: autoAction });
          broadcast(roomId, {
            type: "PLAYER_ACTION_APPLIED",
            playerId,
            action: autoAction.toUpperCase() as any,
          });
        } catch (error) {
          console.error("Auto-action failed:", error);
        }
      }
    }
  }, 1000);

  actionTimers.set(roomId, timer);
}

wss.on("connection", (ws) => {
  connectionCount++;
  const clientId = `client-${connectionCount}`;
  console.log(`🔗 [${clientId}] WebSocket connection established (Total connections: ${wss.clients.size})`);
  
  let session = sessions.create(ws);
  void saveSession(session);
  console.log(`📝 [${clientId}] Session created: ${session.sessionId}`);
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
          const tables = listTables();
          console.log(`🎲 [${clientId}] LIST_TABLES request - returning ${tables.length} tables:`, tables);
          const response = {
            tableId: "",
            type: "TABLE_LIST",
            tables,
          } satisfies ServerEvent;
          ws.send(JSON.stringify(response));
          console.log(`📤 [${clientId}] Sent TABLE_LIST response`);
          break;
        }
        case "JOIN_TABLE": {
          console.log(`🎯 [${clientId}] JOIN_TABLE request for table: ${msg.tableId}`);
          const engine = getRegisteredEngine(msg.tableId);
          if (!engine) {
            ws.send(
              JSON.stringify({
                tableId: msg.tableId,
                type: "ERROR",
                code: "TABLE_NOT_FOUND",
                msg: `Table ${msg.tableId} not found`,
              } satisfies ServerEvent),
            );
            console.log(`❌ [${clientId}] Table ${msg.tableId} not found`);
            break;
          }

          const room = engine.getState();
          session.roomId = msg.tableId;
          void saveSession(session);
          console.log(`📊 [${clientId}] Sending TABLE_SNAPSHOT for ${msg.tableId} with ${room.players.length} players`);
          ws.send(
            JSON.stringify({
              tableId: msg.tableId,
              type: "TABLE_SNAPSHOT",
              table: room,
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
          console.log(`🔗 [${clientId}] ATTACH request with userId: ${msg.userId}`);
          const attached = sessions.attach(ws, msg.userId);
          if (attached) {
            const hadTimeout = attached.timeout !== undefined;
            session.userId = attached.userId;
            session.roomId = attached.roomId;
            sessions.handleReconnect(attached);
            void saveSession(session);
            console.log(`✅ [${clientId}] Session attached successfully - userId: ${attached.userId}, roomId: ${attached.roomId || 'none'}`);
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
          console.log(`🪑 [${clientId}] SIT request - tableId: ${msg.tableId}, seat: ${msg.seat}, buyIn: ${msg.buyIn}`);
          const engine = getEngine(msg.tableId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const nickname = shortAddress(playerId);
          const seatIndex = Number(msg.seat);
          const buyIn = Number(msg.buyIn);
          console.log(`👤 [${clientId}] Player ${nickname} (${playerId}) attempting to sit at seat ${seatIndex}`);
          if (Number.isNaN(seatIndex)) {
            console.log(`❌ [${clientId}] Invalid seat index: ${seatIndex}`);
            break;
          }
          
          const seatingMgr = seating.get(room.id);
          const table = tables.get(room.id);
          console.log(`🔍 [${clientId}] Table objects - seatingMgr: ${!!seatingMgr}, table: ${!!table}`);
          
          if (!seatingMgr || !table) {
            console.log(`❌ [${clientId}] Missing table objects for ${room.id} - recreating...`);
            // Force recreation of table objects
            getEngine(room.id);
            const newSeatingMgr = seating.get(room.id);
            const newTable = tables.get(room.id);
            console.log(`🔄 [${clientId}] After recreation - seatingMgr: ${!!newSeatingMgr}, table: ${!!newTable}`);
          }
          
          const finalSeatingMgr = seating.get(room.id);
          const finalTable = tables.get(room.id);
          
          // Validate seat availability and buy-in using SeatingManager
          if (finalSeatingMgr && finalTable) {
            if (seatIndex < 0 || seatIndex >= finalTable.seats.length) {
              console.log(`❌ [${clientId}] Seat ${seatIndex} out of range`);
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
            if (finalTable.seats[seatIndex]) {
              console.log(`❌ [${clientId}] Seat ${seatIndex} already taken`);
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
            if (buyIn < finalTable.minBuyIn || buyIn > finalTable.maxBuyIn) {
              console.log(
                `❌ [${clientId}] Buy-in ${buyIn} outside range ${finalTable.minBuyIn}-${finalTable.maxBuyIn}`,
              );
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "INVALID_BUYIN",
                  msg: `Buy-in must be between ${finalTable.minBuyIn} and ${finalTable.maxBuyIn}`,
                } satisfies ServerEvent),
              );
              break;
            }

            // Use SeatingManager to seat the player in the Table
            console.log(`🪑 [${clientId}] Using seating manager to seat player ${playerId} at seat ${seatIndex}`);
            const tablePlayer = finalSeatingMgr.seatPlayer(seatIndex, playerId, buyIn);
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
            chips: buyIn,
          });
          seatMaps.get(room.id)?.set(playerId, seatIndex);
          session.roomId = room.id;
          void saveSession(session);
          console.log(`✅ [${clientId}] Player ${nickname} successfully seated at ${seatIndex} with ${buyIn} chips`);
          
          broadcast(room.id, {
            type: "PLAYER_JOINED",
            seat: seatIndex,
            playerId,
          });
          
          const updatedRoom = engine.getState();
          console.log(`📊 [${clientId}] Table now has ${updatedRoom.players.length} players, stage: ${updatedRoom.stage}`);
          
          // Start countdown when we have 2+ players
          if (updatedRoom.players.length >= 2 && updatedRoom.stage === "waiting") {
            console.log(`🎮 [${clientId}] Starting game countdown - ${updatedRoom.players.length} players ready`);
            startGameCountdown(room.id);
          }
          
          void saveRoom(updatedRoom);
          broadcast(updatedRoom.id, { type: "TABLE_SNAPSHOT", table: updatedRoom });
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
          const currentPlayer = room.players[room.currentTurnIndex];
          if (!currentPlayer || currentPlayer.id !== playerId) {
            ws.send(
              JSON.stringify({
                tableId: room.id,
                type: "ERROR",
                code: "NOT_YOUR_TURN",
                msg: "It's not your turn",
              } satisfies ServerEvent),
            );
            break;
          }

          try {
            // Clear action timer when player takes action
            const timer = actionTimers.get(room.id);
            if (timer) {
              clearInterval(timer);
              actionTimers.delete(room.id);
            }
            
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

  ws.on("close", (code, reason) => {
    console.log(`🔌 [${clientId}] WebSocket connection closed (Code: ${code}, Reason: ${reason?.toString() || 'none'}) (Remaining connections: ${wss.clients.size - 1})`);
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

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
console.log(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV}`);
console.log(`🔗 ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'not set'}`);
console.log(`💾 REDIS_URL: ${process.env.REDIS_URL ? 'configured' : 'not configured (using memory)'}`);
console.log(`🎯 Ready to accept WebSocket connections...`);
