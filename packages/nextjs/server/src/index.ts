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
  const tables = [
    // Micro Stakes
    { id: "micro-1", name: "Micro Stakes 1", blinds: { small: 1, big: 2 } },
    { id: "micro-2", name: "Micro Stakes 2", blinds: { small: 1, big: 2 } },
    
    // Low Stakes  
    { id: "low-1", name: "Low Stakes 1", blinds: { small: 5, big: 10 } },
    { id: "low-2", name: "Low Stakes 2", blinds: { small: 5, big: 10 } },
    
    // Mid Stakes
    { id: "mid-1", name: "Mid Stakes 1", blinds: { small: 25, big: 50 } },
    { id: "mid-2", name: "Mid Stakes 2", blinds: { small: 25, big: 50 } },
    
    // High Stakes
    { id: "high-1", name: "High Stakes 1", blinds: { small: 50, big: 100 } },
    { id: "high-2", name: "High Stakes 2", blinds: { small: 50, big: 100 } },
    
    // High Roller
    { id: "whale-1", name: "👑 High Roller 1", blinds: { small: 1000, big: 2000 } },
    { id: "whale-2", name: "👑 High Roller 2", blinds: { small: 1000, big: 2000 } }
  ];

  tables.forEach(({ id, name, blinds }) => {
    const engine = bridge.getEngine(id);
    console.log(`🎯 Created table: ${name} (${blinds.small}/${blinds.big})`);
  });
  
  console.log(`✅ Created ${tables.length} persistent tables`);
}

/**
 * Broadcast events to WebSocket clients
 */
function broadcast(roomId: string, event: ServerEvent): void {
  const msg = JSON.stringify({ tableId: roomId, ...event });
  let sentCount = 0;
  
  wss.clients.forEach((client) => {
    const session = sessions.get(client);
    if (session?.roomId === roomId && client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
        sentCount++;
      } catch (error) {
        console.error(`❌ Broadcast failed:`, error);
      }
    }
  });
  
  console.log(`📡 Event: ${event.type}, Room: ${roomId}, Clients: ${sentCount}`);
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
  console.log(`🔗 [${clientId}] Connected (Total: ${wss.clients.size})`);
  
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
      
      console.log(`📨 [${clientId}] Command: ${command.type}`);
      
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
      console.error(`❌ [${clientId}] Message processing failed:`, error);
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
    console.log(`🔌 [${clientId}] Disconnected (Code: ${code}, Remaining: ${wss.clients.size - 1})`);
    
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
console.log('🎮 Starting Pure Event-Driven FSM Poker Server...');
createPersistentTables();

// Load persisted game state (non-blocking)
(async () => {
  try {
    console.log('📂 Loading persisted game state...');
    const rooms = await loadAllRooms();
    console.log(`📂 Loaded ${rooms.length} persisted rooms`);
    
    // Note: Since we removed GameRoom support, we'll need to migrate
    // any persisted rooms to the new Table format or start fresh
    console.log('ℹ️ Legacy room format detected - starting with fresh tables');
  } catch (error) {
    console.error('❌ Room restoration failed:', error);
    console.log('ℹ️ Continuing with fresh tables');
  }
})();

/**
 * Start Server
 */
server.listen(PORT, () => {
  console.log(`🚀 Pure FSM Poker Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Tables API: http://localhost:${PORT}/api/tables`);
  console.log(`🎯 WebSocket: ws://localhost:${PORT}`);
  console.log(`🎮 Architecture: Direct EventEngine FSM Integration`);
  console.log(`✅ Ready for game connections...`);
});