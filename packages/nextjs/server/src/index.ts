import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GameEngine, TableState, Round } from "../game-engine";
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
const ACTION_TIMEOUT_SECONDS = process.env.ACTION_TIMEOUT_SECONDS ? parseInt(process.env.ACTION_TIMEOUT_SECONDS, 10) : 10;

// Create HTTP server for Heroku compatibility
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
      tables: listTables().length
    }));
    return;
  }
  
  // API endpoint to list tables
  if (url.pathname === '/api/tables') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tables: listTables() }));
    return;
  }
  
  // Default response for HTTP requests
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PokerNFT WebSocket Server - Use WebSocket connection for game play');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });
const sessions = new SessionManager();
const processed = new Map<WebSocket, Set<string>>();

// Track connection count for logging
let connectionCount = 0;
const seatMaps = new Map<string, Map<string, number>>();
const gameStartTimers = new Map<string, NodeJS.Timeout>();
const actionTimers = new Map<string, NodeJS.Timeout>();
const timeoutCounts = new Map<string, number>();
const sitOutPlayers = new Map<string, number>(); // playerId -> sit out timestamp
const tableIdleTimers = new Map<string, NodeJS.Timeout>(); // tableId -> timer
const IDLE_TABLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Idle table management functions
function startIdleTimer(tableId: string) {
  // Clear existing timer if any
  if (tableIdleTimers.has(tableId)) {
    clearTimeout(tableIdleTimers.get(tableId)!);
  }

  const timer = setTimeout(() => {
    console.log(`⏰ [${tableId}] Table idle for 5 minutes, cleaning up...`);
    cleanupIdleTable(tableId);
  }, IDLE_TABLE_TIMEOUT);

  tableIdleTimers.set(tableId, timer);
  console.log(`⏱️ [${tableId}] Started 5-minute idle timer`);
}

function resetIdleTimer(tableId: string) {
  if (tableIdleTimers.has(tableId)) {
    clearTimeout(tableIdleTimers.get(tableId)!);
    tableIdleTimers.delete(tableId);
  }
}

function cleanupIdleTable(tableId: string) {
  const engine = getRegisteredEngine(tableId);
  if (!engine) return;

  const room = engine.getState();
  console.log(`🧹 [${tableId}] Cleaning up idle table with ${room.players.length} players`);

  // Remove all players from the table
  const playerIds = room.players.map(p => p.id);
  playerIds.forEach(playerId => {
    engine.removePlayer(playerId);
    // Clear from seat maps
    seatMaps.get(tableId)?.delete(playerId);
    // Clear from timeout tracking
    timeoutCounts.delete(playerId);
    sitOutPlayers.delete(playerId);
  });

  // Reset the table to default state
  room.stage = "waiting";
  room.players = [];
  room.pot = 0;
  room.communityCards = [];
  room.dealerIndex = 0;
  room.currentTurnIndex = 0;
  room.firstToActIndex = 0;
  room.lastAggressorIndex = 0;

  // Clear any game timers for this table
  if (gameStartTimers.has(tableId)) {
    clearTimeout(gameStartTimers.get(tableId)!);
    gameStartTimers.delete(tableId);
  }
  if (actionTimers.has(tableId)) {
    clearTimeout(actionTimers.get(tableId)!);
    actionTimers.delete(tableId);
  }

  // Clear idle timer
  resetIdleTimer(tableId);

  // Broadcast table reset
  broadcast(tableId, {
    type: "TABLE_RESET",
    message: "Table was idle for 5 minutes and has been reset"
  });

  // Force a table snapshot update
  engine.emit("stateChanged", room);

  console.log(`✅ [${tableId}] Table cleanup completed`);
}

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
    // $1/$2 Tables
    { id: "micro-1", name: "Micro Stakes #1", blinds: { small: 1, big: 2 } },
    { id: "micro-2", name: "Micro Stakes #2", blinds: { small: 1, big: 2 } },
    
    // $5/$10 Tables  
    { id: "low-1", name: "Low Stakes #1", blinds: { small: 5, big: 10 } },
    { id: "low-2", name: "Low Stakes #2", blinds: { small: 5, big: 10 } },
    
    // $25/$50 Tables
    { id: "mid-1", name: "Mid Stakes #1", blinds: { small: 25, big: 50 } },
    { id: "mid-2", name: "🚀 Mid Stakes #2", blinds: { small: 25, big: 50 } },
    
    // $50/$100 Tables
    { id: "stark-1", name: "Stark #1", blinds: { small: 50, big: 100 } },
    { id: "stark-2", name: "Stark #2", blinds: { small: 50, big: 100 } },
    
    // $1000/$2000 Tables (High Roller)
    { id: "High-rollers-1", name: "👑 High rollers #1", blinds: { small: 1000, big: 2000 } },
    { id: "High-rollers-2", name: "👑 High rollers #2", blinds: { small: 1000, big: 2000 } }
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

    // Update engine with correct blind values
    const room = engine.getState();
    room.minBet = blinds.big;
    room.smallBlindAmount = blinds.small;
    room.bigBlindAmount = blinds.big;
    console.log(`🎯 Updated table ${id} blinds: SB=${blinds.small}, BB=${blinds.big}`);
  });
  
  console.log(`🎯 Total tables available: ${listTables().length}`);
}

function getEngine(id: string, snapshot?: GameRoom): GameEngine {
  let engine = getRegisteredEngine(id);
  if (!engine) {
    engine = new GameEngine(id, 50, ACTION_TIMEOUT_SECONDS);
    if (snapshot) {
      engine.loadState(snapshot);
    }
    registerTable(id, engine);

    // Set up idle timer event listeners for the new engine
    engine.on("handStarted", () => {
      console.log(`🎮 [${id}] Hand started, clearing idle timer`);
      resetIdleTimer(id);
    });

    engine.on("handEnded", () => {
      console.log(`🏁 [${id}] Hand ended, starting idle timer`);
      startIdleTimer(id);
    });

    // GameEngine is now the single source of truth - no need for separate Table object
    const seatMap = new Map<string, number>();
    seatMaps.set(id, seatMap);
    console.log(`🎯 [GameEngine] Created engine for table ${id} - GameEngine is single source of truth`);
    
    // Restore players from snapshot if available
    if (snapshot) {
      snapshot.players.forEach((p) => {
        try {
          engine!.addPlayer({
            id: p.id,
            nickname: p.nickname || `Player${p.seat}`,
            seat: p.seat,
            chips: p.chips,
          });
          seatMap.set(p.id, p.seat);
          console.log(`🔄 [GameEngine] Restored player ${p.id} to seat ${p.seat}`);
        } catch (error) {
          console.log(`❌ [GameEngine] Failed to restore player ${p.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }

    let prevStage: Stage = engine!.getState().stage;

    engine!.on("stateChanged", (room: GameRoom) => {
      void saveRoom(room);
      broadcast(id, { type: "TABLE_SNAPSHOT", table: room });
    });

    engine!.on("stageChanged", (stage: Stage) => {
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

    engine!.on("handEnded", () => {
      broadcast(id, { type: "HAND_END" });
    });

    engine!.on("dealerMessage", (message: string) => {
      broadcast(id, { 
        type: "DEALER_MESSAGE", 
        message,
        tableId: id
      });
    });

    engine!.on("showdownStarted", (data: { winners: string[], potAmount: number }) => {
      broadcast(id, {
        type: "SHOWDOWN",
        revealOrder: data.winners,
        tableId: id
      });
      console.log(`🃏 [${id}] Broadcasting showdown with ${data.winners.length} winner(s), pot: $${data.potAmount}`);
    });

    engine!.on("readyForNewHand", () => {
      // Add any waiting players to the game before starting next hand countdown
      const waitingPlayers = Array.from(seatMaps.get(id)?.entries() || []).filter(([playerId, seatIndex]) => {
        const room = engine!.getState();
        return !room.players.find(p => p.id === playerId);
      });
      
      if (waitingPlayers.length > 0) {
        console.log(`🎮 Adding ${waitingPlayers.length} waiting players to room ${id}`);
        waitingPlayers.forEach(([playerId, seatIndex]) => {
          const SEAT_BUYIN = 10000;
          const nickname = shortAddress(playerId);
          engine!.addPlayer({
            id: playerId,
            nickname,
            seat: seatIndex,
            chips: SEAT_BUYIN,
          });
          
          console.log(`✅ Added waiting player ${nickname} to seat ${seatIndex}`);
        });
      }
      
      // Start countdown for next hand when 2+ players remain with chips
      console.log(`🔄 Hand ended, starting new game countdown for room ${id}`);
      startGameCountdown(id);
    });

    engine!.on("turnChanged", (turnInfo: any) => {
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

function broadcast(roomId: string, event: any) {
  const msg = JSON.stringify({ tableId: roomId, ...event });
  let sentCount = 0;
  let totalClients = 0;
  let inRoomClients = 0;
  
  console.log(`📡 [broadcast] Starting broadcast for event: ${event.type} to room: ${roomId}`);
  
  wss.clients.forEach((client) => {
    totalClients++;
    const session = sessions.get(client as WebSocket);
    const isInRoom = session?.roomId === roomId;
    const isOpen = client.readyState === WebSocket.OPEN;
    
    if (isInRoom) {
      inRoomClients++;
      console.log(`📡 [broadcast] Found client in room ${roomId}: sessionId=${session?.sessionId?.slice(0, 10)}..., userId=${session?.userId?.slice(0, 10) || 'none'}..., open=${isOpen}`);
    }
    
    if (isInRoom && isOpen) {
      try {
        client.send(msg);
        sentCount++;
        console.log(`✅ [broadcast] Message sent successfully to client in room ${roomId}`);
      } catch (error) {
        console.error(`❌ [broadcast] Failed to send message to client:`, error);
      }
    }
  });
  
  console.log(`📡 [broadcast] Event: ${event.type}, Room: ${roomId}, Sent: ${sentCount}/${inRoomClients} clients in room (${totalClients} total clients)`);
  
  // Warn if no clients received the message
  if (sentCount === 0 && inRoomClients > 0) {
    console.warn(`⚠️ [broadcast] WARNING: ${inRoomClients} clients in room but 0 messages sent! Possible connection issues.`);
  }
}

function startGameCountdown(roomId: string) {
  // Clear existing timer
  const existingTimer = gameStartTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  let countdown = 10;
  broadcast(roomId, { type: "TIMER", countdown });

  const timer = setInterval(() => {
    countdown--;
    broadcast(roomId, { type: "TIMER", countdown });

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

  let countdown = ACTION_TIMEOUT_SECONDS;
  broadcast(roomId, { type: "TIMER", countdown });

  const timer = setInterval(() => {
    countdown--;
    broadcast(roomId, { type: "TIMER", countdown });

    if (countdown <= 0) {
      clearInterval(timer);
      actionTimers.delete(roomId);
      
      // Auto-action (fold or check based on rules)
      const engine = getEngine(roomId);
      const room = engine.getState();
      const player = room.players.find((p) => p.id === playerId);

      if (player && player.isTurn) {
        const maxBet = Math.max(0, ...room.players.map((p) => p.currentBet));
        const betToCall = maxBet - player.currentBet;

        // If no bet to call, check; otherwise fold
        const autoAction = betToCall === 0 ? "check" : "fold";

        try {
          console.log(`⏰ [${playerId}] Auto-action: ${autoAction} (timeout)`);
          engine.handleAction(playerId, { type: autoAction });
          broadcast(roomId, {
            type: "PLAYER_ACTION_APPLIED",
            playerId,
            action: autoAction.toUpperCase() as any,
          });

          // Check if this auto-action results in only one player remaining
          const updatedRoom = engine.getState();
          const activePlayersAfterAction = updatedRoom.players.filter(p => !p.hasFolded);
          
          if (activePlayersAfterAction.length === 1) {
            console.log(`🏆 [${roomId}] Auto-fold resulted in single winner: ${activePlayersAfterAction[0].id}, stage: ${updatedRoom.stage}`);
            // The GameEngine.handleAction should have already handled the payout and state change
            // Events will be emitted by GameEngine, server just needs to ensure timers are cleared
            clearInterval(timer);
            actionTimers.delete(roomId);
          }

          // Track consecutive timeouts with progressive punishment
          const count = (timeoutCounts.get(playerId) ?? 0) + 1;
          timeoutCounts.set(playerId, count);

          if (count === 1) {
            console.log(`⚠️ [${roomId}] Warning: Player ${playerId} timed out once`);
            // First timeout - just a warning, continue playing
          } else if (count === 2) {
            // Second timeout - sit out the player
            console.log(`😴 [${roomId}] Sitting out player ${playerId} due to inactivity`);
            sitOutPlayers.set(playerId, Date.now());
            
            const seatIndex = seatMaps.get(roomId)?.get(playerId);
            if (seatIndex !== undefined) {
              broadcast(roomId, {
                type: "PLAYER_SAT_OUT",
                seat: seatIndex,
                playerId,
                reason: "inactivity"
              });
            }
          } else if (count >= 3) {
            // Third timeout or more - remove the player permanently
            const seatIndex = seatMaps.get(roomId)?.get(playerId);
            console.log(`🚪 [${roomId}] Removing player ${playerId} due to extended inactivity`);
            
            seatMaps.get(roomId)?.delete(playerId);
            sitOutPlayers.delete(playerId);
            if (engine.removePlayer(playerId)) {
              broadcast(roomId, {
                type: "PLAYER_LEFT",
                seat: seatIndex,
                playerId,
                reason: "inactivity"
              });
            }
            timeoutCounts.delete(playerId);
          }
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
          const room = engine.getState();
          ws.send(
            JSON.stringify({
              tableId: id,
              type: "TABLE_CREATED",
              table: {
                id,
                name: msg.name,
                gameType: "No Limit Hold'em",
                playerCount: room.players.length,
                maxPlayers: 9,
                smallBlind: Math.floor(room.minBet / 2),
                bigBlind: room.minBet
              },
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
              const playerId = existing.userId ?? existing.sessionId;
              
              // Restore player to seat if they were seated before disconnecting
              if (existing.seat !== undefined && existing.chips !== undefined && existing.nickname) {
                const playerInRoom = room.players.find(p => p.id === playerId);
                if (!playerInRoom) {
                  console.log(`🔄 [REATTACH] Restoring player ${playerId} to seat ${existing.seat} with ${existing.chips} chips`);
                  try {
                    engine.addPlayer({
                      id: playerId,
                      nickname: existing.nickname,
                      seat: existing.seat,
                      chips: existing.chips,
                    });
                    seatMaps.get(room.id)?.set(playerId, existing.seat);
                    console.log(`✅ [REATTACH] Player ${playerId} restored to game successfully`);
                  } catch (error) {
                    console.log(`❌ [REATTACH] Failed to restore player ${playerId}: ${error instanceof Error ? error.message : String(error)}`);
                    // If seat is taken, reset session seat data
                    if (error instanceof Error && error.message.includes("already taken")) {
                      existing.seat = undefined;
                      existing.chips = undefined;
                      existing.inActiveHand = false;
                      void saveSession(existing);
                    }
                  }
                } else {
                  console.log(`✅ [REATTACH] Player ${playerId} already in room at seat ${playerInRoom.seat}`);
                  // Update session with current game state
                  existing.seat = playerInRoom.seat;
                  existing.chips = playerInRoom.chips;
                  existing.inActiveHand = room.stage !== "waiting";
                  void saveSession(existing);
                }
              }
              
              if (hadTimeout) {
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
              
              // Always send fresh table snapshot after potential restoration
              const updatedRoom = engine.getState();
              ws.send(
                JSON.stringify({
                  tableId: updatedRoom.id,
                  type: "TABLE_SNAPSHOT",
                  table: updatedRoom,
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
            // Preserve current roomId if it exists, otherwise use attached roomId
            session.roomId = session.roomId || attached.roomId;
            sessions.handleReconnect(attached);
            void saveSession(session);
            console.log(`✅ [${clientId}] Session attached successfully - userId: ${attached.userId}, roomId: ${session.roomId || 'none'}`);
            ws.send(
              JSON.stringify({
                tableId: session.roomId ?? "",
                type: "SESSION",
                sessionId: attached.sessionId,
                userId: attached.userId,
              } satisfies ServerEvent),
            );
            if (session.roomId) {
              const engine = getEngine(session.roomId);
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

          // Check if a hand is currently active
          if (room.stage !== "waiting") {
            console.log(`🚫 [${clientId}] Cannot join during active hand (stage: ${room.stage}). Player will be seated but must wait for next hand.`);
            
            // Still allow seating but don't add to active game
            seatMaps.get(room.id)?.set(playerId, seatIndex);
            session.roomId = room.id;
            void saveSession(session);
            
            // Send a special message indicating the player must wait
            ws.send(
              JSON.stringify({
                tableId: room.id,
                type: "WAITING_FOR_NEXT_HAND",
                seat: seatIndex,
                msg: "Hand in progress. You will join the next hand.",
              } satisfies ServerEvent),
            );
            
            broadcast(room.id, {
              type: "PLAYER_WAITING",
              seat: seatIndex,
              playerId,
            });
            
            break;
          }

          // Add player to GameEngine - always give $10k per seat
          const SEAT_BUYIN = 10000;
          try {
            engine.addPlayer({
              id: playerId,
              nickname,
              seat: seatIndex,
              chips: SEAT_BUYIN,
            });
            seatMaps.get(room.id)?.set(playerId, seatIndex);
            
            // Update session with game state
            session.roomId = room.id;
            session.seat = seatIndex;
            session.chips = SEAT_BUYIN;
            session.nickname = nickname;
            session.inActiveHand = false;
            void saveSession(session);
            console.log(`✅ [${clientId}] Player ${nickname} successfully seated at ${seatIndex} with ${SEAT_BUYIN} chips (always $10k per seat)`);
          } catch (error) {
            console.log(`❌ [${clientId}] Failed to seat player: ${error instanceof Error ? error.message : String(error)}`);
            let errorCode = "SEATING_FAILED";
            if (error instanceof Error) {
              if (error.message.includes("already seated")) {
                errorCode = "ALREADY_SEATED";
              } else if (error.message.includes("already taken")) {
                errorCode = "SEAT_TAKEN";
              } else if (error.message.includes("Invalid seat")) {
                errorCode = "INVALID_SEAT";
              }
            }
            ws.send(
              JSON.stringify({
                tableId: room.id,
                type: "ERROR",
                code: errorCode,
                msg: error instanceof Error ? error.message : "Failed to take seat",
              } satisfies ServerEvent),
            );
            break;
          }
          
          const updatedRoom = engine.getState();
          console.log(`📊 [${clientId}] Table now has ${updatedRoom.players.length} players, stage: ${updatedRoom.stage}`);
          
          // GameEngine automatically broadcasts TABLE_SNAPSHOT via stateChanged event - no manual broadcast needed
          
          // Start countdown when we have 2+ players
          if (updatedRoom.players.length >= 2 && updatedRoom.stage === "waiting") {
            console.log(`🎮 [${clientId}] Starting game countdown - ${updatedRoom.players.length} players ready`);
            startGameCountdown(room.id);
          }
          
          void saveRoom(updatedRoom);
          break;
        }
        case "LEAVE": {
          // Support leaving specific table or current table
          const tableIdToLeave = (msg as any).tableId || session.roomId;
          if (!tableIdToLeave) break;
          
          const engine = getEngine(tableIdToLeave);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          
          console.log(`🚪 [${session.sessionId}] Player ${playerId} leaving table ${room.id} from seat ${seatIndex}`);
          
          // Remove from GameEngine (single source of truth)
          if (engine.removePlayer(playerId)) {
            seatMaps.get(room.id)?.delete(playerId);
            
            // Explicitly broadcast PLAYER_LEFT event to ensure client cleanup
            if (seatIndex !== undefined) {
              broadcast(room.id, {
                type: "PLAYER_LEFT",
                seat: seatIndex,
                playerId,
                reason: "left_voluntarily"
              });
            }

            // If table is now empty and not in an active game, start idle timer
            const updatedRoom = engine.getState();
            if (updatedRoom.players.length === 0 && updatedRoom.stage === "waiting") {
              console.log(`📭 [${room.id}] Table is now empty, starting idle timer`);
              startIdleTimer(room.id);
            }
          }
          
          // Clear session game state
          if (tableIdToLeave === session.roomId) {
            session.roomId = undefined;
            session.seat = undefined;
            session.chips = undefined;
            session.inActiveHand = false;
          }
          
          void saveSession(session);
          
          // GameEngine automatically broadcasts TABLE_SNAPSHOT via stateChanged event - no manual broadcast needed
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
            
            // Broadcast action event first
            broadcast(room.id, {
              type: "PLAYER_ACTION_APPLIED",
              playerId,
              action,
              amount: msg.amount,
            });
            
            // GameEngine automatically broadcasts TABLE_SNAPSHOT via stateChanged event - no manual broadcast needed
            
            timeoutCounts.delete(playerId);
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
          
          // Update player chips in GameEngine (single source of truth)
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            if (msg.amount <= 0 || msg.amount > 10000) {
              ws.send(
                JSON.stringify({
                  tableId: room.id,
                  type: "ERROR",
                  code: "REBUY_FAILED",
                  msg: "Invalid rebuy amount",
                } satisfies ServerEvent),
              );
              break;
            }
            player.chips += msg.amount;
            
            // Update session state
            session.chips = player.chips;
            void saveSession(session);
            
            console.log(`💰 [REBUY] Player ${playerId} added ${msg.amount} chips, now has ${player.chips}`);
            // GameEngine will automatically broadcast via stateChanged event when room state changes
            engine.emit("stateChanged", room);
          } else {
            ws.send(
              JSON.stringify({
                tableId: room.id,
                type: "ERROR",
                code: "REBUY_FAILED",
                msg: "Player not found at table",
              } satisfies ServerEvent),
            );
          }
          break;
        }
        case "SIT_OUT": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          
          if (seatIndex !== undefined) {
            console.log(`😴 [${session.sessionId}] Player ${playerId} voluntarily sitting out from seat ${seatIndex}`);
            
            // Mark player as sitting out voluntarily
            sitOutPlayers.set(playerId, Date.now());
            
            // Reset timeout count since they voluntarily sat out
            timeoutCounts.delete(playerId);
            
            broadcast(session.roomId, {
              type: "PLAYER_SAT_OUT",
              seat: seatIndex,
              playerId,
              reason: "voluntary"
            });
          }
          break;
        }
        case "SIT_IN": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          const playerId = session.userId ?? session.sessionId;
          const seatIndex = seatMaps.get(room.id)?.get(playerId);
          
          if (seatIndex !== undefined && sitOutPlayers.has(playerId)) {
            console.log(`🪑 [${session.sessionId}] Player ${playerId} returning to active play at seat ${seatIndex}`);
            
            // Remove from sit-out tracking
            sitOutPlayers.delete(playerId);
            
            // Reset timeout count
            timeoutCounts.delete(playerId);
            
            broadcast(session.roomId, {
              type: "PLAYER_SAT_IN",
              seat: seatIndex,
              playerId
            });
          }
          break;
        }
        case "POST_BLIND": {
          if (!session.roomId) break;
          const engine = getEngine(session.roomId);
          const room = engine.getState();
          
          // Blinds are automatically posted by GameEngine during hand start
          console.log(`📝 [${session.sessionId}] POST_BLIND request - blinds handled automatically by GameEngine`);
          broadcast(room.id, { type: "BLINDS_POSTED" });
          
          // GameEngine automatically handles state and broadcasts - no manual TABLE_SNAPSHOT needed
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

// Start HTTP server with WebSocket support
server.listen(PORT, () => {
  console.log(`🚀 HTTP+WebSocket server running on port ${PORT}`);
  console.log(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`🔗 ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'not set'}`);
  console.log(`💾 REDIS_URL: ${process.env.REDIS_URL ? 'configured' : 'not configured (using memory)'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Tables API: http://localhost:${PORT}/api/tables`);
  console.log(`🎯 WebSocket connections: ws://localhost:${PORT}`);
  console.log(`🎮 Ready to accept game connections...`);
});
