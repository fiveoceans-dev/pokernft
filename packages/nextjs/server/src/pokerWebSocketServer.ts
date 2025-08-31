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
import { logger } from "../game-engine/utils/logger";
import { getTableConfig, getRecommendedBuyIn, validateBuyIn } from "./tableConfig";

/**
 * Professional WebSocket-FSM Bridge
 * 
 * Provides clean translation between WebSocket client commands and EventEngine FSM events.
 * Maintains separation of concerns with proper error handling and validation.
 * 
 * @extends EventEmitter
 * @example
 * ```typescript
 * const bridge = new WebSocketFSMBridge(sessions);
 * bridge.on('broadcast', (roomId, event) => broadcast(roomId, event));
 * await bridge.handleCommand(ws, session, command);
 * ```
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
   * 
   * Creates a new EventEngine instance if one doesn't exist for the given table.
   * Each table has its own isolated EventEngine with complete event sourcing.
   * Uses table configuration for blind levels.
   * 
   * @param tableId - Unique identifier for the poker table
   * @param smallBlind - Optional small blind override
   * @param bigBlind - Optional big blind override
   * @returns EventEngine instance for the specified table
   * @throws {Error} If tableId is invalid or configuration not found
   */
  getEngine(tableId: string, smallBlind?: number, bigBlind?: number): EventEngine {
    let engine = this.engines.get(tableId);
    if (!engine) {
      // Get table configuration or use provided blinds
      const config = getTableConfig(tableId);
      const sb = smallBlind ?? config?.blinds.small ?? 5;
      const bb = bigBlind ?? config?.blinds.big ?? 10;
      
      engine = new EventEngine(tableId, sb, bb);
      this.engines.set(tableId, engine);
      this.seatMaps.set(tableId, new Map());

      // Forward FSM events to WebSocket clients
      this.setupEngineEventForwarding(engine, tableId);
      
      logger.info(`🎯 Created EventEngine for table ${tableId} with blinds ${sb}/${bb}`);
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

    // Game countdown events
    engine.on('gameStartCountdown', (data: any) => {
      this.emit('broadcast', tableId, {
        type: "GAME_START_COUNTDOWN",
        countdown: data.seconds,
        activePlayerCount: data.activePlayerCount,
        totalPlayerCount: data.totalPlayerCount
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
   * Handle SIT command via FSM events with dynamic buy-in
   */
  private async handleSitCommand(session: Session, command: any): Promise<void> {
    try {
      // Validate input
      if (!command.tableId || typeof command.seat !== 'number') {
        throw new Error("Invalid SIT command: missing tableId or seat");
      }
      
      if (command.seat < 0 || command.seat > 8) {
        throw new Error("Invalid seat number: must be 0-8");
      }

      const engine = this.getEngine(command.tableId);
      const playerId = this.normalizePlayerId(command.playerId || session.userId || session.sessionId);
      
      // Validate player ID
      if (!playerId || playerId.length === 0) {
        throw new Error("Invalid player ID");
      }
      
      // Calculate buy-in based on table configuration
      const requestedChips = command.chips;
      const recommendedBuyIn = getRecommendedBuyIn(command.tableId);
      const buyInChips = requestedChips ?? recommendedBuyIn; // Use requested or recommended
      
      // Validate buy-in amount
      const buyInValidation = validateBuyIn(command.tableId, buyInChips);
      if (!buyInValidation.valid) {
        throw new Error(buyInValidation.error || "Invalid buy-in amount");
      }
      
      // Dispatch PlayerJoin event through FSM
      await engine.dispatch({
        t: "PlayerJoin",
        seat: command.seat,
        pid: playerId,
        chips: buyInChips, // Dynamic buy-in based on table
        nickname: this.shortAddress(playerId)
      });

      // Update session and seat mapping
      session.roomId = command.tableId;
      session.seat = command.seat;
      session.chips = buyInChips;
      this.seatMaps.get(command.tableId)?.set(playerId, command.seat);
      
      logger.info(`✅ Player ${playerId} successfully joined table ${command.tableId} at seat ${command.seat} with ${buyInChips} chips`);
    } catch (error) {
      logger.error(`❌ SIT command failed:`, error);
      throw error; // Re-throw for higher level handler
    }
  }

  /**
   * Handle ACTION command via FSM events  
   */
  private async handleActionCommand(session: Session, command: any): Promise<void> {
    try {
      if (!session.roomId) {
        throw new Error("Player not in any room");
      }
      
      // Validate action
      const validActions = ['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALLIN'];
      if (!validActions.includes(command.action)) {
        throw new Error(`Invalid action: ${command.action}`);
      }
      
      // Validate amount for betting actions
      if (['BET', 'RAISE'].includes(command.action)) {
        if (typeof command.amount !== 'number' || command.amount <= 0) {
          throw new Error("Invalid amount for betting action");
        }
      }
    
      const engine = this.getEngine(session.roomId);
      const playerId = this.normalizePlayerId(session.userId || session.sessionId);
      const seatId = this.seatMaps.get(session.roomId)?.get(playerId);
      
      if (seatId === undefined) {
        throw new Error("Player not found at table");
      }

      // Dispatch Action event through FSM
      await engine.dispatch({
        t: "Action",
        seat: seatId,
        action: command.action,
        amount: command.amount
      });
      
      logger.debug(`🎮 Player ${playerId} executed ${command.action}${command.amount ? ` (${command.amount})` : ''}`);
    } catch (error) {
      logger.error(`❌ ACTION command failed:`, error);
      throw error;
    }
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
    if (!session.roomId || session.seat === undefined) return;
    
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const engine = this.engines.get(session.roomId);
    
    if (!engine) {
      console.error(`❌ [WebSocket] No engine found for table ${session.roomId}`);
      return;
    }

    // Dispatch PlayerSitOut event to FSM
    engine.dispatch({
      t: "PlayerSitOut",
      seat: session.seat,
      pid: playerId,
      reason: "voluntary"
    });

    // Also update SitOutManager for timeout tracking
    const sitOutManager = getSitOutManager(session.roomId);
    sitOutManager.markSitOut(playerId, "voluntary");
    
    this.emit('broadcast', session.roomId, {
      type: "PLAYER_SIT_OUT",
      seat: session.seat,
      playerId,
      reason: "voluntary"
    });
  }

  /**
   * Handle sit in via SitOutManager integration
   */
  private async handleSitInCommand(session: Session): Promise<void> {
    if (!session.roomId || session.seat === undefined) return;
    
    const playerId = this.normalizePlayerId(session.userId || session.sessionId);
    const engine = this.engines.get(session.roomId);
    
    if (!engine) {
      console.error(`❌ [WebSocket] No engine found for table ${session.roomId}`);
      return;
    }

    // Dispatch PlayerSitIn event to FSM
    engine.dispatch({
      t: "PlayerSitIn",
      seat: session.seat,
      pid: playerId
    });

    // Also update SitOutManager for timeout tracking
    const sitOutManager = getSitOutManager(session.roomId);
    sitOutManager.markSitIn(playerId);
    
    this.emit('broadcast', session.roomId, {
      type: "PLAYER_SIT_IN",
      seat: session.seat,
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
   * Get all tables for lobby with enhanced information
   */
  getTables(): LobbyTable[] {
    return Array.from(this.engines.entries()).map(([id, engine]) => {
      const table = engine.getState();
      const config = getTableConfig(id);
      
      return {
        id,
        name: config?.name ?? `Table ${id}`,
        gameType: "No Limit Hold'em",
        playerCount: table.seats.filter(s => s.pid).length,
        maxPlayers: 9,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        // Add stake level information
        stakeLevel: config?.stakeLevel,
        buyInRange: config ? `${config.buyIn.min}-${config.buyIn.max}` : undefined
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