/**
 * Professional Production WebSocket Poker Server
 * 
 * Pure Event-Driven FSM Architecture:
 * - Direct EventEngine integration (no adapter layer)
 * - EventEngine as single source of truth
 * - All state changes through event dispatch
 * - Complete event sourcing and auditability
 */

import 'dotenv/config';
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

// Import pure FSM components (no legacy types)
import { createEventEngine, EventEngine } from "../game-engine";
import type { 
  Table,
  ServerEvent,
  ClientCommand,
  LobbyTable
} from "../game-engine";

import { SessionManager, Session } from "./sessionManager";
import { WebSocketFSMBridge } from "./pokerWebSocketServer";
import { logger } from "../game-engine/utils/logger";
import { TABLES } from "./tableConfig";
import { globalSeatMappings } from "./seatMappingManager";
import {
  saveSession,
  saveRoom,
  loadAllRooms,
  loadSession,
} from "./persistence";

// Environment Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

/**
 * HTTP Server with Health Endpoints
 */
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
      tables: bridge.getTables().length
    }));
    return;
  }
  
  // API endpoint to list tables
  if (url.pathname === '/api/tables') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tables: bridge.getTables() }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Pure Event-Driven FSM Poker Server - Use WebSocket for game play');
});

/**
 * WebSocket Server with FSM Integration
 */
const wss = new WebSocketServer({ server });
const sessions = new SessionManager();
const bridge = new WebSocketFSMBridge(sessions);

// Connection tracking
let connectionCount = 0;

/**
 * Create persistent tables on startup
 */
function createPersistentTables(): void {
  TABLES.forEach((tableConfig) => {
    const engine = bridge.getEngine(
      tableConfig.id, 
      tableConfig.blinds.small, 
      tableConfig.blinds.big
    );
    
    logger.info(`🎯 Created table: ${tableConfig.name} (${tableConfig.blinds.small}/${tableConfig.blinds.big}) - Buy-in: ${tableConfig.buyIn.min}-${tableConfig.buyIn.max} chips [${tableConfig.stakeLevel}]`);
  });
  
  logger.info(`✅ Created ${TABLES.length} persistent tables across ${new Set(TABLES.map(t => t.stakeLevel)).size} stake levels`);
}

/**
 * Broadcast events to WebSocket clients
 */
function sanitizeTableForSession(table: Table, session: Session): Table {
  // Only expose holeCards for the viewer's own seat; strip others
  const viewerSeat = session.seat;
  const seats = table.seats.map((s, idx) => {
    if (s && s.pid && idx !== viewerSeat) {
      const { holeCards, ...rest } = s as any;
      return { ...rest, holeCards: undefined };
    }
    return s;
  });
  // Enforce numeric-only arrays for community and burns
  const communityCards = (table.communityCards || []).filter((c: any) => typeof c === 'number');
  const burns = table.burns
    ? {
        flop: (table.burns.flop || []).filter((c: any) => typeof c === 'number'),
        turn: (table.burns.turn || []).filter((c: any) => typeof c === 'number'),
        river: (table.burns.river || []).filter((c: any) => typeof c === 'number'),
      }
    : undefined;
  return { ...table, seats, communityCards, burns };
}

function broadcast(roomId: string, event: ServerEvent): void {
  let sentCount = 0;

  wss.clients.forEach((client) => {
    const session = sessions.get(client);
    if (session?.roomId === roomId && client.readyState === WebSocket.OPEN) {
      try {
        // Sanitize TABLE_SNAPSHOT per viewer to avoid leaking others' hole cards
        let payload: ServerEvent = event;
        if (event.type === "TABLE_SNAPSHOT") {
          const sanitized = sanitizeTableForSession((event as any).table, session);
          payload = { ...event, table: sanitized } as ServerEvent;
        }
        const msg = JSON.stringify({ ...payload, tableId: roomId });
        client.send(msg);
        sentCount++;
      } catch (error) {
        logger.error(`❌ Broadcast failed:`, error);
      }
    }
  });

  logger.debug(`📡 Event: ${event.type}, Room: ${roomId}, Clients: ${sentCount}`);
}

/**
 * Setup FSM bridge event forwarding
 */
bridge.on('broadcast', broadcast);
bridge.on('error', (roomId: string, error: ServerEvent) => {
  broadcast(roomId, error);
});

/**
 * WebSocket Connection Handler
 */
wss.on("connection", (ws: WebSocket) => {
  connectionCount++;
  const clientId = `client-${connectionCount}`;
  logger.info(`🔗 [${clientId}] Connected (Total: ${wss.clients.size})`);
  
  let session = sessions.create(ws);
  void saveSession(session);
  
  // Send session info to client
  ws.send(JSON.stringify({
    tableId: "",
    type: "SESSION",
    sessionId: session.sessionId,
    userId: session.userId,
  } satisfies ServerEvent));

  /**
   * Message Handler - Convert WebSocket commands to FSM events
   */
  ws.on("message", async (data) => {
    try {
      const command: ClientCommand = JSON.parse(data.toString());
      
      logger.debug(`📨 [${clientId}] Command: ${command.type}`);
      
      // Handle session-level commands
      switch (command.type) {
        case "LIST_TABLES":
          const tables = bridge.getTables();
          ws.send(JSON.stringify({
            tableId: "",
            type: "TABLE_LIST",
            tables,
          } satisfies ServerEvent));
          break;

        case "JOIN_TABLE":
          session.roomId = command.tableId;
          void saveSession(session);
          
          try {
            const table = bridge.getTableState(command.tableId);
            
            // Proactively restore seat mapping on rejoin to prevent action failures
            if (session.userId) {
              const normalizedId = session.userId.toLowerCase().trim();
              logger.debug(`🔧 [JOIN_TABLE] Attempting seat mapping recovery for ${normalizedId}`);
              
              // Check if player exists in FSM table state but not in seat mappings
              for (let i = 0; i < table.seats.length; i++) {
                const seat = table.seats[i];
                if (seat?.pid && seat.pid.toLowerCase().trim() === normalizedId) {
                  // Found player in FSM - restore their seat mapping
                  const existingMapping = globalSeatMappings.findSeat(command.tableId, normalizedId);
                  if (existingMapping === undefined) {
                    globalSeatMappings.setSeatMapping(command.tableId, normalizedId, i);
                    logger.info(`🔧 [JOIN_TABLE] Restored seat mapping: ${normalizedId} -> seat ${i}`);
                  } else {
                    logger.debug(`ℹ️ [JOIN_TABLE] Seat mapping already exists: ${normalizedId} -> seat ${existingMapping}`);
                  }
                  break;
                }
              }
            }
            
            ws.send(JSON.stringify({
              tableId: command.tableId,
              type: "TABLE_SNAPSHOT",
              table, // Send Table format directly
            } satisfies ServerEvent));
          } catch (error) {
            ws.send(JSON.stringify({
              tableId: command.tableId,
              type: "ERROR",
              code: "TABLE_NOT_FOUND",
              msg: `Table ${command.tableId} not found`,
            } satisfies ServerEvent));
          }
          break;

        case "CREATE_TABLE":
          const tableId = randomUUID();
          const engine = bridge.getEngine(tableId);
          const table = bridge.getTableState(tableId);
          
          ws.send(JSON.stringify({
            tableId,
            type: "TABLE_CREATED",
            table: {
              id: tableId,
              name: command.name,
              gameType: "No Limit Hold'em", 
              playerCount: table.seats.filter(s => s.pid).length,
              maxPlayers: 9,
              smallBlind: table.smallBlind,
              bigBlind: table.bigBlind
            } as LobbyTable,
          } satisfies ServerEvent));
          break;

        case "REATTACH":
          // Handle session reattachment
          let existing = sessions.getBySessionId(command.sessionId);
          if (!existing) {
            const data = await loadSession(command.sessionId);
            if (data) {
              existing = sessions.restore(data, ws);
            }
          }
          
          if (existing) {
            sessions.handleReconnect(existing);
            sessions.expire(session);
            sessions.replaceSocket(existing, ws);
            session = existing;
            void saveSession(existing);
            
            ws.send(JSON.stringify({
              tableId: existing.roomId ?? "",
              type: "SESSION",
              sessionId: existing.sessionId,
              userId: existing.userId,
            } satisfies ServerEvent));
            
            if (existing.roomId) {
              const table = bridge.getTableState(existing.roomId);
              ws.send(JSON.stringify({
                tableId: existing.roomId,
                type: "TABLE_SNAPSHOT", 
                table,
              } satisfies ServerEvent));
            }
          }
          break;

        case "ATTACH":
          const attached = sessions.attach(ws, command.userId);
          if (attached) {
            session.userId = attached.userId;
            session.roomId = session.roomId || attached.roomId;
            sessions.handleReconnect(attached);
            void saveSession(session);
            
            ws.send(JSON.stringify({
              tableId: session.roomId ?? "",
              type: "SESSION",
              sessionId: attached.sessionId,
              userId: attached.userId,
            } satisfies ServerEvent));
            
            if (session.roomId) {
              const table = bridge.getTableState(session.roomId);
              ws.send(JSON.stringify({
                tableId: session.roomId,
                type: "TABLE_SNAPSHOT",
                table,
              } satisfies ServerEvent));
            }
          }
          break;

        default:
          // Forward game commands to FSM bridge
          await bridge.handleCommand(ws, session, command);
          break;
      }
      
    } catch (error) {
      logger.error(`❌ [${clientId}] Message processing failed:`, error);
      ws.send(JSON.stringify({
        tableId: session.roomId || "",
        type: "ERROR",
        code: "BAD_MESSAGE",
        msg: String(error),
      } satisfies ServerEvent));
    }
  });

  /**
   * Disconnect Handler
   */
  ws.on("close", (code, reason) => {
    logger.info(`🔌 [${clientId}] Disconnected (Code: ${code}, Remaining: ${wss.clients.size - 1})`);
    
    sessions.handleDisconnect(session, (s: Session) => {
      if (s.roomId && s.seat !== undefined) {
        broadcast(s.roomId, {
          type: "PLAYER_DISCONNECTED",
          tableId: s.roomId,
          seat: s.seat,
          playerId: s.userId || s.sessionId,
        });
      }
    });
  });
});

/**
 * Server Startup
 */
logger.info('🎮 Starting Pure Event-Driven FSM Poker Server...');
createPersistentTables();

// Load persisted game state (non-blocking)
(async () => {
  try {
    logger.info('📂 Loading persisted game state...');
    const rooms = await loadAllRooms();
    logger.info(`📂 Loaded ${rooms.length} persisted rooms`);
    
    // Using pure Table format for persistence
    logger.info('ℹ️ Pure FSM architecture - using Table format only');
  } catch (error) {
    logger.error('❌ Room restoration failed:', error);
    logger.info('ℹ️ Continuing with fresh tables');
  }
})();

/**
 * Graceful Shutdown Handler
 */
function gracefulShutdown(signal: string): void {
  logger.info(`📶 Received ${signal}, starting graceful shutdown...`);
  
  // Close WebSocket server
  wss.close(() => {
    logger.info('🔌 WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    logger.info('🌐 HTTP server closed');
  });
  
  // Cleanup all engines
  bridge.getTables().forEach(table => {
    try {
      const engine = bridge.getEngine(table.id);
      // Engines have their own cleanup via TimerIntegration.shutdown()
      logger.debug(`🧹 Cleaned up engine for table ${table.id}`);
    } catch (error) {
      logger.error(`❌ Error cleaning up table ${table.id}:`, error);
    }
  });
  
  logger.info('✅ Graceful shutdown completed');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start Server
 */
server.listen(PORT, () => {
  logger.info(`🚀 Pure FSM Poker Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🏥 Health: http://localhost:${PORT}/health`);
  logger.info(`📊 Tables API: http://localhost:${PORT}/api/tables`);
  logger.info(`🎯 WebSocket: ws://localhost:${PORT}`);
  logger.info(`🎮 Architecture: Direct EventEngine FSM Integration`);
  logger.info(`✅ Ready for game connections...`);
});
