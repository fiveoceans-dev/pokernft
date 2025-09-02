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
import { EventEngine, Table, PokerEvent, TimerEvent } from "../game-engine";
import type { ServerEvent, ClientCommand, LobbyTable } from "../game-engine";
import { SessionManager, Session } from "./sessionManager";
import { getSitOutManager } from "../game-engine/managers/sitOutManager";
import { TimerIntegration } from "../game-engine/managers/timerEvents";
import { logger } from "../game-engine/utils/logger";
import { getTableConfig, getRecommendedBuyIn, validateBuyIn } from "./tableConfig";
import { globalSeatMappings } from "./seatMappingManager";
import { saveSession } from "./persistence";

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

  constructor(sessions: SessionManager) {
    super();
    this.sessions = sessions;
  }

  /**
   * Get canonical identity for consistent lookups
   * Priority: 1) Command playerId 2) Session wallet 3) Session ID
   */
  private async getCanonicalId(session: Session, command?: any): Promise<string> {
    // If command provides identity, bind it to session if not already bound
    if (command?.playerId) {
      const normalizedPlayerId = this.normalizePlayerId(command.playerId);
      logger.debug(`🔍 [Identity] Command playerId: ${normalizedPlayerId}, Session userId: ${session.userId}`);
      
      if (!session.userId) {
        // Bind wallet identity to session
        const success = this.sessions.updateBinding(session, normalizedPlayerId);
        if (success) {
          // CRITICAL: Persist the session binding
          try {
            await saveSession(session);
            logger.info(`✅ [Identity] Bound and persisted wallet ${normalizedPlayerId} to session ${session.sessionId}`);
          } catch (error) {
            logger.error(`❌ [Identity] Failed to persist session binding:`, error);
          }
        } else {
          logger.warn(`⚠️ [Identity] Failed to bind ${normalizedPlayerId} to session ${session.sessionId}`);
        }
      } else if (session.userId !== normalizedPlayerId) {
        logger.warn(`🔄 [Identity] Wallet mismatch: session has ${session.userId}, command has ${normalizedPlayerId}`);
      } else {
        // Already bound correctly - ensure it's persisted
        try {
          await saveSession(session);
          logger.debug(`📦 [Identity] Session already bound correctly, ensured persistence`);
        } catch (error) {
          logger.error(`❌ [Identity] Failed to persist existing session binding:`, error);
        }
      }
      
      return normalizedPlayerId;
    }
    
    // Use session's bound wallet or fall back to session ID
    const canonicalId = this.normalizePlayerId(session.userId || session.sessionId);
    logger.debug(`🎯 [Identity] Resolved canonical ID: ${canonicalId} (from ${session.userId ? 'userId' : 'sessionId'})`);
    return canonicalId;
  }

  /**
   * Resolve seat mapping with self-healing recovery
   */
  private async resolveSeatMapping(session: Session, tableId: string): Promise<number | undefined> {
    const canonicalId = await this.getCanonicalId(session);
    logger.debug(`🔍 [SeatResolve] Resolving seat for canonical ID: ${canonicalId}`);
    
    // Try direct lookup
    let seatId = globalSeatMappings.findSeat(tableId, canonicalId);
    logger.debug(`🔍 [SeatResolve] Direct lookup result: ${seatId}`);
    
    if (seatId === undefined) {
      logger.warn(`⚠️ [SeatResolve] No direct mapping found, attempting FSM recovery...`);
      // Attempt recovery from FSM state
      try {
        const table = this.getTableState(tableId);
        logger.debug(`🔍 [SeatResolve] FSM table seats:`, table.seats.map(s => ({ id: s.id, pid: s.pid })));
        
        const foundSeat = table.seats.find(s => 
          s.pid && this.normalizePlayerId(s.pid) === canonicalId
        );
        
        if (foundSeat) {
          // Repair the mapping
          globalSeatMappings.setSeatMapping(tableId, canonicalId, foundSeat.id);
          logger.warn(`🔧 [Identity] Recovered seat mapping: ${canonicalId} -> seat ${foundSeat.id}`);
          return foundSeat.id;
        } else {
          logger.error(`❌ [Recovery] Player ${canonicalId} not found in FSM table state`);
        }
      } catch (error) {
        logger.error(`❌ [Identity] Failed to recover seat mapping for ${canonicalId}:`, error);
      }
    }
    
    // If still not found, try raw sessionId as last resort
    if (seatId === undefined && session.sessionId !== canonicalId) {
      logger.warn(`⚠️ [SeatResolve] Trying sessionId fallback: ${session.sessionId}`);
      seatId = globalSeatMappings.findSeat(tableId, session.sessionId);
      if (seatId !== undefined) {
        // Repair the mapping with correct canonical ID
        globalSeatMappings.setSeatMapping(tableId, canonicalId, seatId);
        logger.warn(`🔧 [Recovery] Found seat using sessionId, repaired mapping: ${canonicalId} -> seat ${seatId}`);
      }
    }
    
    logger.debug(`🎯 [SeatResolve] Final seat result: ${seatId} for ${canonicalId}`);
    return seatId;
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

      // Forward FSM events to WebSocket clients
      this.setupEngineEventForwarding(engine, tableId);
      
       // Initialize action timer integration for this engine (FSM side effects drive timers)
      try {
        const timeoutMs = parseInt(process.env.ACTION_TIMEOUT_SECONDS || "15") * 1000;
        const timerIntegration = new TimerIntegration(engine as any, tableId, timeoutMs);
        engine.setTimerManager(timerIntegration);
      } catch (e) {
        logger.error(`❌ Failed to initialize timer integration for ${tableId}:`, e);
      }
      
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

    // Action countdown events (client-driven model)
    engine.on('actionCountdown', (countdownEvent: any) => {
      this.emit('broadcast', tableId, {
        type: "COUNTDOWN_START",
        countdownType: countdownEvent.countdownType,
        startTime: countdownEvent.startTime,
        duration: countdownEvent.duration,
        metadata: countdownEvent.metadata
      });
    });

    engine.on('actionTimeout', (data: any) => {
      this.emit('broadcast', tableId, {
        type: "TIMER",
        countdown: 0
      });
    });

    // Game countdown events - now using client-driven model
    engine.on('gameStartCountdown', (countdownEvent: any) => {
      this.emit('broadcast', tableId, {
        type: "COUNTDOWN_START",
        countdownType: countdownEvent.countdownType,
        startTime: countdownEvent.startTime,
        duration: countdownEvent.duration,
        metadata: countdownEvent.metadata
      });
    });

    // Street deal countdown events
    engine.on('streetDealCountdown', (countdownEvent: any) => {
      this.emit('broadcast', tableId, {
        type: "COUNTDOWN_START",
        countdownType: countdownEvent.countdownType,
        startTime: countdownEvent.startTime,
        duration: countdownEvent.duration,
        metadata: countdownEvent.metadata
      });
    });

    // New hand countdown events
    engine.on('newHandCountdown', (countdownEvent: any) => {
      this.emit('broadcast', tableId, {
        type: "COUNTDOWN_START",
        countdownType: countdownEvent.countdownType,
        startTime: countdownEvent.startTime,
        duration: countdownEvent.duration,
        metadata: countdownEvent.metadata
      });
    });

    // Reconnect countdown events
    engine.on('reconnectCountdown', (countdownEvent: any) => {
      this.emit('broadcast', tableId, {
        type: "COUNTDOWN_START",
        countdownType: countdownEvent.countdownType,
        startTime: countdownEvent.startTime,
        duration: countdownEvent.duration,
        metadata: countdownEvent.metadata
      });
    });

    // Game flow events
    engine.on('eventProcessed', (event: PokerEvent, table: Table) => {
      this.handleEventForwarding(event, table, tableId);
    });

    // Forward waiting player info so UI can show proper 'waiting' status
    engine.on('playerWaitingForNextHand', ({ pid }: { pid: string }) => {
      try {
        const table = this.getTableState(tableId);
        const seat = table.seats.find(s => s.pid && s.pid.toLowerCase() === pid.toLowerCase());
        if (seat) {
          this.emit('broadcast', tableId, {
            tableId,
            type: "PLAYER_WAITING",
            seat: seat.id,
            playerId: pid
          } as any);
        }
      } catch (error) {
        logger.error(`❌ Failed to broadcast PLAYER_WAITING for ${pid} on ${tableId}:`, error);
      }
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
            cards: table.communityCards.slice(0, 3)
          });
        } else if (event.street === "turn" && table.communityCards.length >= 4) {
          this.emit('broadcast', tableId, {
            type: "DEAL_TURN", 
            card: table.communityCards[3]
          });
        } else if (event.street === "river" && table.communityCards.length >= 5) {
          this.emit('broadcast', tableId, {
            type: "DEAL_RIVER",
            card: table.communityCards[4]
          });
        }
        break;

      case "HandEnd":
        this.emit('broadcast', tableId, { type: "HAND_END" });
        break;

      case "Payout": {
        try {
          const distributions = (event as any).distributions || [];
          // Aggregate winners by pid with positive amounts
          const winnersMap = new Map<string, number>();
          let total = 0;
          for (const d of distributions) {
            if (d.amount > 0) {
              const prev = winnersMap.get(d.pid) || 0;
              winnersMap.set(d.pid, prev + d.amount);
              total += d.amount;
            }
          }
          if (winnersMap.size > 0) {
            const winners = Array.from(winnersMap.keys()).map(pid => {
              const seat = table.seats.find(s => s.pid && s.pid.toLowerCase() === pid.toLowerCase());
              return { seat: seat ? seat.id : -1, playerId: pid };
            });
            this.emit('broadcast', tableId, {
              type: "WINNER_ANNOUNCEMENT",
              winners,
              potAmount: total
            } as any);
          }
        } catch (e) {
          logger.error(`❌ [Bridge] Failed to emit WINNER_ANNOUNCEMENT:`, e);
        }
        break;
      }
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
      const errEvent = {
        type: "ERROR",
        code: "COMMAND_FAILED",
        msg: error instanceof Error ? error.message : String(error)
      } as ServerEvent;
      this.emit('error', session.roomId || "", errEvent);

      // Graceful recovery: broadcast fresh snapshot to resync UI
      try {
        if (session.roomId) {
          const table = this.getTableState(session.roomId);
          this.emit('broadcast', session.roomId, {
            tableId: session.roomId,
            type: "TABLE_SNAPSHOT",
            table,
          } as ServerEvent);
        }
      } catch (snapErr) {
        logger.error(`❌ Failed to broadcast snapshot after error:`, snapErr);
      }
    }
  }

  /**
   * Handle SIT command with unified identity management
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

      // Get canonical identity (binds wallet to session if needed)
      logger.info(`🪑 [SIT] Starting seat join for session ${session.sessionId}, seat ${command.seat}`);
      logger.debug(`🔍 [SIT] Session state before: userId=${session.userId}, playerId from command=${command.playerId}`);
      
      const canonicalId = await this.getCanonicalId(session, command);
      
      logger.debug(`🔍 [SIT] Session state after binding: userId=${session.userId}`);
      logger.info(`✅ [SIT] Canonical ID resolved: ${canonicalId}`);
      
      // Validate canonical ID
      if (!canonicalId || canonicalId.length === 0) {
        throw new Error("Invalid canonical identity");
      }

      const engine = this.getEngine(command.tableId);
      
      // Calculate buy-in based on table configuration
      const requestedChips = command.chips;
      const recommendedBuyIn = getRecommendedBuyIn(command.tableId);
      const buyInChips = requestedChips ?? recommendedBuyIn; // Use requested or recommended
      
      // Validate buy-in amount
      const buyInValidation = validateBuyIn(command.tableId, buyInChips);
      if (!buyInValidation.valid) {
        throw new Error(buyInValidation.error || "Invalid buy-in amount");
      }
      
      // Dispatch PlayerJoin event through FSM with canonical ID
      await engine.dispatch({
        t: "PlayerJoin",
        seat: command.seat,
        pid: canonicalId,
        chips: buyInChips,
        nickname: this.shortAddress(canonicalId)
      });

      // Update session state
      session.roomId = command.tableId;
      session.seat = command.seat;
      session.chips = buyInChips;
      session.userId = canonicalId;  // CRITICAL: Set userId to canonical ID
      
      // Persist complete session with userId
      await saveSession(session);
      
      // Store seat mapping with canonical ID
      logger.info(`💺 [SIT] Storing seat mapping: ${canonicalId} -> seat ${command.seat} on table ${command.tableId}`);
      globalSeatMappings.setSeatMapping(command.tableId, canonicalId, command.seat);
      
      logger.info(`✅ Player ${canonicalId} successfully joined table ${command.tableId} at seat ${command.seat} with ${buyInChips} chips`);
    } catch (error) {
      logger.error(`❌ SIT command failed:`, error);
      throw error; // Re-throw for higher level handler
    }
  }

  /**
   * Handle ACTION command with self-healing recovery
   */
  private async handleActionCommand(session: Session, command: any): Promise<void> {
    try {
      logger.info(`🎮 [ACTION] Starting action processing for session ${session.sessionId}, command: ${command.action}`);
      logger.debug(`🔍 [ACTION] Session state: userId=${session.userId}, roomId=${session.roomId}, seat=${session.seat}`);
      
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
      
      // Use self-healing seat resolution
      logger.debug(`🔍 [ACTION] Resolving seat mapping for session ${session.sessionId}...`);
      const seatId = await this.resolveSeatMapping(session, session.roomId);
      
      if (seatId === undefined) {
        logger.error(`❌ [ACTION] Seat resolution failed - session: ${session.sessionId}, userId: ${session.userId}, roomId: ${session.roomId}`);
        // Log current seat mappings for debugging
        const mappings = globalSeatMappings.getTableMappings(session.roomId);
        logger.error(`💺 [ACTION] Current seat mappings:`, mappings);
        throw new Error("Player not found at table (no valid seat mapping)");
      }
      
      logger.info(`✅ [ACTION] Resolved seat ${seatId} for session ${session.sessionId}`);

      // Professional normalization: treat BET as RAISE if a bet already exists
      try {
        const state = engine.getState();
        const seat = state.seats[seatId];
        const toCall = Math.max(0, state.currentBet - (seat?.streetCommitted || 0));
        if (command.action === 'BET' && state.currentBet > 0) {
          logger.debug(`🔁 [ACTION] Normalizing BET->RAISE (currentBet=${state.currentBet}, toCall=${toCall})`);
          command.action = 'RAISE';
        }
      } catch (e) {
        logger.warn(`⚠️ [ACTION] Failed to normalize action (using raw):`, e);
      }

      // Dispatch Action event through FSM
      await engine.dispatch({
        t: "Action",
        seat: seatId,
        action: command.action,
        amount: command.amount
      });
      
      const canonicalId = await this.getCanonicalId(session);
      logger.debug(`🎮 Player ${canonicalId} executed ${command.action}${command.amount ? ` (${command.amount})` : ''} from seat ${seatId}`);
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
    const canonicalId = await this.getCanonicalId(session);
    const seatId = await this.resolveSeatMapping(session, session.roomId);
    
    if (seatId === undefined) return;

    // Professional leave handling: Auto-fold if it's player's turn
    const tableState = engine.getState();
    if (tableState.actor === seatId && 
        ["preflop", "flop", "turn", "river"].includes(tableState.phase)) {
      
      logger.info(`🚪 [WebSocket] Auto-folding ${canonicalId} before leaving (player's turn)`);
      
      // Auto-fold first
      await engine.dispatch({
        t: "Action",
        seat: seatId,
        action: "FOLD"
      });
    }

    // Then dispatch PlayerLeave event through FSM
    await engine.dispatch({
      t: "PlayerLeave",
      seat: seatId,
      pid: canonicalId
    });

    // Clean up mappings
    globalSeatMappings.removePlayer(session.roomId, canonicalId);
    session.roomId = undefined;
    session.seat = undefined;
  }

  /**
   * Handle sit out via SitOutManager integration
   */
  private async handleSitOutCommand(session: Session): Promise<void> {
    if (!session.roomId || session.seat === undefined) return;
    
    const canonicalId = await this.getCanonicalId(session);
    const engine = this.engines.get(session.roomId);
    
    if (!engine) {
      console.error(`❌ [WebSocket] No engine found for table ${session.roomId}`);
      return;
    }

    // Dispatch PlayerSitOut event to FSM (authoritative path)
    await engine.dispatch({
      t: "PlayerSitOut",
      seat: session.seat,
      pid: canonicalId,
      reason: "voluntary"
    });

    // No direct broadcast of PLAYER_SIT_OUT; engine's stateChanged snapshot is the source of truth
  }

  /**
   * Handle sit in via SitOutManager integration
   */
  private async handleSitInCommand(session: Session): Promise<void> {
    if (!session.roomId || session.seat === undefined) return;
    
    const canonicalId = await this.getCanonicalId(session);
    const engine = this.engines.get(session.roomId);
    
    if (!engine) {
      console.error(`❌ [WebSocket] No engine found for table ${session.roomId}`);
      return;
    }

    // Dispatch PlayerSitIn event to FSM (authoritative path)
    await engine.dispatch({
      t: "PlayerSitIn",
      seat: session.seat,
      pid: canonicalId
    });
    // No direct broadcast; rely on engine's stateChanged snapshots
  }

  /**
   * Start reconnect countdown for player
   */
  startReconnectCountdown(tableId: string, playerId: string, gracePeriodMs = 30000): void {
    const engine = this.engines.get(tableId);
    if (!engine) {
      console.error(`❌ [WebSocket] No engine found for table ${tableId}`);
      return;
    }

    // Emit reconnect countdown event
    engine.emit('reconnectCountdown', {
      type: "COUNTDOWN_START",
      countdownType: "reconnect",
      startTime: Date.now(),
      duration: gracePeriodMs,
      metadata: {
        playerId,
        reason: "connection_lost"
      }
    });
    
    console.log(`🔄 [WebSocket] Started reconnect countdown for ${playerId} (${gracePeriodMs}ms)`);
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
