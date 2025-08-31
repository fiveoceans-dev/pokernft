/**
 * Professional Production WebSocket-FSM Bridge
 * 
 * Direct integration between WebSocket server and EventEngine FSM:
 * - No adapter layer - pure event-driven communication
 * - EventEngine is single source of truth
 * - All state changes through event dispatch
 * - Complete event sourcing and audit trail
 */

import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { EventEngine, Table, PokerEvent, TimerEvent, indexToCard } from "../game-engine";
import type { ServerEvent, ClientCommand, LobbyTable } from "../game-engine";
import { SessionManager, Session } from "./sessionManager";
import { getSitOutManager } from "../game-engine/managers/sitOutManager";

/**
 * WebSocket to FSM Event Mapper
 * Converts WebSocket commands to FSM events
 */
class WebSocketFSMBridge extends EventEmitter {
  private engines = new Map<string, EventEngine>();
  private sessions: SessionManager;
  private seatMaps = new Map<string, Map<string, number>>();

  constructor(sessions: SessionManager) {
    super();
    this.sessions = sessions;
  }

  /**
   * Get or create EventEngine for table
   * Pure FSM - no adapter layer
   */
  getEngine(tableId: string): EventEngine {
    let engine = this.engines.get(tableId);
    if (!engine) {
      engine = new EventEngine(tableId, 5, 10); // Use EventEngine directly
      this.engines.set(tableId, engine);
      this.seatMaps.set(tableId, new Map());

      // Forward FSM events to WebSocket clients
      this.setupEngineEventForwarding(engine, tableId);
    }
    return engine;
  }

  /**
   * Setup pure event forwarding from FSM to WebSocket
   * No state conversion - forward Table format directly
   */
  private setupEngineEventForwarding(engine: EventEngine, tableId: string): void {
    // State changes - send Table format directly to clients
    engine.on('stateChanged', (table: Table) => {
      this.emit('broadcast', tableId, {
        type: "TABLE_SNAPSHOT",
        table // Send Table directly - clients adapt
      });
    });

    // Timer events
    engine.on('turnStarted', (data: any) => {
      this.emit('broadcast', tableId, {
        type: "ACTION_PROMPT",
        actingIndex: data.seat,
        betToCall: 0, // Calculate from table state
        minRaise: 0,  // Calculate from table state
        timeLeftMs: data.deadline - Date.now()
      });
    });

    engine.on('actionTimeout', (data: any) => {
      this.emit('broadcast', tableId, {
        type: "TIMER",
        countdown: 0
      });
    });

    // Game flow events
    engine.on('eventProcessed', (event: PokerEvent, table: Table) => {
      this.handleEventForwarding(event, table, tableId);
    });
  }

  /**
   * Forward specific FSM events to WebSocket format
   */
  private handleEventForwarding(event: PokerEvent, table: Table, tableId: string): void {
    switch (event.t) {
      case "StartHand":
        this.emit('broadcast', tableId, { type: "HAND_START" });
        break;

      case "EnterStreet":
        if (event.street === "flop" && table.communityCards.length >= 3) {
          this.emit('broadcast', tableId, {
            type: "DEAL_FLOP",
            cards: table.communityCards.slice(0, 3).map(indexToCard)
          });
        } else if (event.street === "turn" && table.communityCards.length >= 4) {
          this.emit('broadcast', tableId, {
            type: "DEAL_TURN", 
            card: indexToCard(table.communityCards[3])
          });
        } else if (event.street === "river" && table.communityCards.length >= 5) {
          this.emit('broadcast', tableId, {
            type: "DEAL_RIVER",
            card: indexToCard(table.communityCards[4])
          });
        }
        break;

      case "HandEnd":
        this.emit('broadcast', tableId, { type: "HAND_END" });
        break;
    }
  }

  /**
   * Process WebSocket command by dispatching FSM events
   * Pure event-driven - no direct state manipulation
   */
  async handleCommand(ws: WebSocket, session: Session, command: ClientCommand): Promise<void> {
    try {
      switch (command.type) {
        case "SIT":
          await this.handleSitCommand(session, command);
          break;

        case "ACTION":
          await this.handleActionCommand(session, command);
          break;

        case "LEAVE":
          await this.handleLeaveCommand(session);
          break;

        case "SIT_OUT":
          await this.handleSitOutCommand(session);
          break;

        case "SIT_IN":
          await this.handleSitInCommand(session);
          break;

        default:
          this.emit('error', session.roomId || "", {
            type: "ERROR",
            code: "UNKNOWN_COMMAND",
            msg: (command as any).type
          });
      }
    } catch (error) {
      this.emit('error', session.roomId || "", {
        type: "ERROR",
        code: "COMMAND_FAILED",
        msg: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle SIT command via FSM events
   */
  private async handleSitCommand(session: Session, command: any): Promise<void> {
    const engine = this.getEngine(command.tableId);
    const playerId = this.normalizePlayerId(command.playerId || session.userId || session.sessionId);
    
    // Dispatch PlayerJoin event through FSM
    await engine.dispatch({
      t: "PlayerJoin",
      seat: command.seat,
      pid: playerId,
      chips: 10000, // Standard buy-in
      nickname: this.shortAddress(playerId)
    });

    // Update session and seat mapping
    session.roomId = command.tableId;
    session.seat = command.seat;
    session.chips = 10000;
    this.seatMaps.get(command.tableId)?.set(playerId, command.seat);
  }

  /**
   * Handle ACTION command via FSM events  
   */
  private async handleActionCommand(session: Session, command: any): Promise<void> {
    if (!session.roomId) return;
    
    const engine = this.getEngine(session.roomId);
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const seatId = this.seatMaps.get(session.roomId)?.get(playerId);
    
    if (seatId === undefined) return;

    // Dispatch Action event through FSM
    await engine.dispatch({
      t: "Action",
      seat: seatId,
      action: command.action,
      amount: command.amount
    });
  }

  /**
   * Handle LEAVE command via FSM events
   */
  private async handleLeaveCommand(session: Session): Promise<void> {
    if (!session.roomId) return;
    
    const engine = this.getEngine(session.roomId);
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const seatId = this.seatMaps.get(session.roomId)?.get(playerId);
    
    if (seatId === undefined) return;

    // Dispatch PlayerLeave event through FSM
    await engine.dispatch({
      t: "PlayerLeave",
      seat: seatId,
      pid: playerId
    });

    // Clean up session
    this.seatMaps.get(session.roomId)?.delete(playerId);
    session.roomId = undefined;
    session.seat = undefined;
  }

  /**
   * Handle sit out via SitOutManager integration
   */
  private async handleSitOutCommand(session: Session): Promise<void> {
    if (!session.roomId) return;
    
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const sitOutManager = getSitOutManager(session.roomId);
    
    // Use SitOutManager for sit out logic
    sitOutManager.markSitOut(playerId, "voluntary");
    
    this.emit('broadcast', session.roomId, {
      type: "PLAYER_SAT_OUT",
      seat: session.seat!,
      playerId,
      reason: "voluntary"
    });
  }

  /**
   * Handle sit in via SitOutManager integration
   */
  private async handleSitInCommand(session: Session): Promise<void> {
    if (!session.roomId) return;
    
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const sitOutManager = getSitOutManager(session.roomId);
    
    // Use SitOutManager for sit in logic
    sitOutManager.markSitIn(playerId);
    
    this.emit('broadcast', session.roomId, {
      type: "PLAYER_SAT_IN",
      seat: session.seat!,
      playerId
    });
  }

  /**
   * Get current table state from FSM
   */
  getTableState(tableId: string): Table {
    const engine = this.engines.get(tableId);
    if (!engine) {
      throw new Error(`Table ${tableId} not found`);
    }
    return engine.getState();
  }

  /**
   * Get all tables for lobby
   */
  getTables(): LobbyTable[] {
    return Array.from(this.engines.entries()).map(([id, engine]) => {
      const table = engine.getState();
      return {
        id,
        name: `Table ${id}`,
        gameType: "No Limit Hold'em",
        playerCount: table.seats.filter(s => s.pid).length,
        maxPlayers: 9,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind
      };
    });
  }

  /**
   * Utility functions
   */
  private normalizePlayerId(playerId: string): string {
    return playerId.toLowerCase().trim();
  }

  private shortAddress(address: string): string {
    return address.length > 10 ? 
      `${address.slice(0, 6)}...${address.slice(-4)}` : 
      address;
  }
}

export { WebSocketFSMBridge };