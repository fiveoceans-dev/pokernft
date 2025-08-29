/**
 * WebSocket Adapter for Event-Driven Poker Engine
 * 
 * Bridges the WebSocket server with the state machine-based poker engine.
 * 
 * This adapter:
 * - Translates between WebSocket API and internal event-driven architecture
 * - Converts internal Table state to WebSocket-friendly GameRoom format
 * - Manages timer integration for player actions
 * - Emits events that WebSocket clients can consume
 */

import { EventEmitter } from "events";
import { EventEngine } from '../core/eventEngine';
import { TimerIntegration } from '../managers/timerEvents';
import { Table, Seat } from '../core/types';
import { GameRoom, PlayerSession } from '../core/types';
import { indexToCard } from '../utils/utils';

/**
 * WebSocket adapter that wraps the EventEngine for server integration
 */
export class WebSocketAdapter extends EventEmitter {
  private eventEngine: EventEngine;
  private timerIntegration: TimerIntegration;
  private tableId: string;

  constructor(tableId: string, minBet = 10, actionTimeoutSeconds = 10) {
    super();
    
    this.tableId = tableId;
    const smallBlind = Math.floor(minBet / 2);
    const bigBlind = minBet;
    
    // Create event-driven poker engine
    this.eventEngine = new EventEngine(tableId, smallBlind, bigBlind);
    
    // Setup timer integration
    this.timerIntegration = new TimerIntegration(this.eventEngine, actionTimeoutSeconds * 1000);
    
    // Connect timer to state machine
    this.eventEngine.setTimerManager(this.timerIntegration);
    
    // Forward events to WebSocket clients
    this.setupEventForwarding();
    
    console.log(`🔗 [WebSocketAdapter] Created for table ${tableId}`);
  }

  /**
   * Setup event forwarding from engine to WebSocket format
   */
  private setupEventForwarding(): void {
    // Forward state changes to WebSocket clients
    this.eventEngine.on('stateChanged', (table: Table) => {
      const webSocketRoom = this.toWebSocketFormat(table);
      
      // Debug logging for state changes
      console.log(`🔄 [WebSocketAdapter] State change: phase=${table.phase}, actor=${table.actor}, players=${table.seats.filter(s => s.pid).length}`);
      if (table.actor !== undefined) {
        const actorSeat = table.seats[table.actor];
        console.log(`   👤 Actor: ${actorSeat?.pid} (seat ${table.actor}), chips=${actorSeat?.chips}`);
      }
      
      this.emit('stateChanged', webSocketRoom);
    });

    // Forward timer events
    this.eventEngine.on('turnStarted', (data) => {
      this.emit('turnChanged', {
        actingIndex: data.seat,
        playerId: data.pid,
        timeLeftMs: data.deadline - Date.now()
      });
    });

    this.eventEngine.on('actionWarning', (data) => {
      this.emit('actionWarning', data);
    });

    this.eventEngine.on('timerCleared', (data) => {
      this.emit('actionCountdown', { 
        playerId: data.pid, 
        remainingMs: 0 
      });
    });

    // Forward game events
    this.eventEngine.on('eventProcessed', (event, table) => {
      this.handleEventForwarding(event, table);
    });
  }

  /**
   * Handle specific event forwarding for WebSocket clients
   */
  private handleEventForwarding(event: any, table: Table): void {
    switch (event.t) {
      case "StartHand":
        this.emit('handStarted');
        break;
        
      case "EnterStreet":
        this.emit('stageChanged', event.street);
        break;
        
      case "Showdown":
        this.emit('showdownStarted', {
          winners: [], // Will be populated with actual winners
          potAmount: table.pots.reduce((sum, pot) => sum + pot.amount, 0)
        });
        break;
        
      case "HandEnd":
        this.emit('handEnded');
        this.emit('readyForNewHand');
        break;
    }
  }

  /**
   * Convert internal Table structure to WebSocket GameRoom format
   */
  private toWebSocketFormat(table: Table): GameRoom {
    const players: PlayerSession[] = table.seats
      .filter(seat => seat.pid)
      .map(seat => ({
        id: seat.pid!,
        nickname: seat.nickname,
        tableId: table.id,
        seat: seat.id,
        chips: seat.chips,
        isDealer: table.button === seat.id,
        currentBet: seat.streetCommitted,
        hasFolded: seat.status === "folded",
        isTurn: table.actor !== undefined && table.actor === seat.id,
        hand: seat.holeCards ? seat.holeCards.map(index => indexToCard(index)) : [],
        // Additional fields for compatibility
        stack: seat.chips, // Alias for chips
        betThisRound: seat.streetCommitted,
        committed: seat.committed,
        isAllIn: seat.status === "allin",
        state: this.convertSeatStatusToPlayerState(seat.status)
      } as any));

    return {
      id: table.id,
      players,
      dealerIndex: table.button,
      currentTurnIndex: table.actor ?? -1,
      firstToActIndex: 0, // Will be calculated properly in full implementation
      lastAggressorIndex: table.lastAggressor ?? -1,
      stage: table.phase as any,
      pot: table.pots.reduce((sum, pot) => sum + pot.amount, 0),
      communityCards: table.communityCards.map(index => indexToCard(index)),
      minBet: table.bigBlind,
      smallBlindAmount: table.smallBlind,
      bigBlindAmount: table.bigBlind,
      deck: [], // Not used in event-driven architecture
      actionHistory: [], // Can be added later if needed
      // Additional fields for internal use
      ...(({
        board: table.communityCards.map(index => indexToCard(index)), // Alias for communityCards
        handNumber: table.handNumber,
        timestamp: table.timestamp,
        pots: table.pots // Additional field for internal use
      }))
    } as GameRoom;
  }

  /**
   * Convert internal seat status to WebSocket player state
   */
  private convertSeatStatusToPlayerState(status: string): any {
    // Map to the WebSocket PlayerState format
    switch (status) {
      case "active": return "ACTIVE";
      case "folded": return "FOLDED";
      case "allin": return "ALL_IN";
      case "empty": return "EMPTY";
      default: return "ACTIVE";
    }
  }

  // ============================================================================
  // WEBSOCKET API METHODS
  // ============================================================================

  /**
   * Get current game state in WebSocket format
   */
  getState(): GameRoom {
    const table = this.eventEngine.getState();
    return this.toWebSocketFormat(table);
  }

  /**
   * Load game state from WebSocket format
   */
  loadState(room: GameRoom): void {
    // Convert WebSocket room to internal table format and load
    console.log(`📂 [WebSocketAdapter] Loading room state for ${room.id}`);
    
    // Add players from the room
    room.players.forEach(player => {
      this.eventEngine.addPlayer({
        id: player.id,
        seat: player.seat,
        chips: player.chips || (player as any).stack || 0,
        nickname: player.nickname
      });
    });
  }

  /**
   * Add player to table
   */
  addPlayer(playerData: { id: string; nickname?: string; seat: number; chips: number }): void {
    // Pre-validate to provide immediate feedback
    const table = this.eventEngine.getState();
    
    // Validate seat index
    if (playerData.seat < 0 || playerData.seat >= table.seats.length) {
      throw new Error("Invalid seat");
    }
    
    // Check if seat is already occupied
    if (table.seats[playerData.seat].pid) {
      throw new Error("Seat already taken");
    }
    
    // Check if player is already seated elsewhere
    const existingSeat = table.seats.find(seat => seat.pid === playerData.id);
    if (existingSeat) {
      throw new Error("Player already seated");
    }
    
    // Validate chips amount
    if (playerData.chips <= 0) {
      throw new Error("Invalid chips amount");
    }
    
    // Process the command through the event engine
    const success = this.eventEngine.processCommand({
      type: "join",
      playerId: playerData.id,
      seatId: playerData.seat,
      chips: playerData.chips,
      nickname: playerData.nickname
    });
    
    console.log(`🔗 [WebSocketAdapter] Dispatched join command for player ${playerData.id}`);
  }

  /**
   * Remove player from table
   */
  removePlayer(playerId: string): boolean {
    const table = this.eventEngine.getState();
    const seat = table.seats.find(s => s.pid === playerId);
    
    if (seat) {
      this.eventEngine.processCommand({
        type: "leave",
        playerId,
        seatId: seat.id
      });
      return true;
    }
    
    return false;
  }

  /**
   * Handle player action
   */
  async handleAction(playerId: string, action: { type: string; amount?: number }): Promise<any> {
    const table = this.eventEngine.getState();
    const seat = table.seats.find(s => s.pid === playerId);
    
    if (!seat) {
      throw new Error("Player not found at table");
    }

    await this.eventEngine.processCommand({
      type: "action",
      seatId: seat.id,
      action: action.type.toLowerCase() as any,
      amount: action.amount
    });

    return { success: true }; // WebSocket return format
  }

  /**
   * Start new hand (async to ensure completion)
   */
  async startHand(): Promise<void> {
    try {
      await this.eventEngine.processCommand({ type: "start_hand" });
      console.log(`🎯 [WebSocketAdapter] Hand start completed successfully`);
    } catch (error) {
      console.error(`❌ [WebSocketAdapter] Hand start failed:`, error);
      throw error;
    }
  }

  /**
   * Set action timeout
   */
  setActionTimeout(timeoutMs: number): void {
    this.timerIntegration.getTimerManager().setDefaultTimeout(timeoutMs);
  }

  // ============================================================================
  // TIMER INTEGRATION
  // ============================================================================

  /**
   * Setup timer callbacks
   */
  setupTimerCallbacks(): void {
    // Timer callbacks are handled through events
    console.log(`⏰ [WebSocketAdapter] Timer callbacks setup through event system`);
  }

  /**
   * Setup timer events
   */
  setupTimerEvents(): void {
    // Timer events are automatically setup in constructor
    console.log(`⏰ [WebSocketAdapter] Timer events setup through integration layer`);
  }

  // ============================================================================
  // EVENT EMISSIONS (maintain WebSocket behavior)
  // ============================================================================

  /**
   * Emit dealer message
   */
  emitDealerMessage(message: string): void {
    this.emit('dealerMessage', message);
  }

  /**
   * Emit showdown started
   */
  emitShowdown(data: { winners: string[]; potAmount: number }): void {
    this.emit('showdownStarted', data);
  }

  // ============================================================================
  // DEBUGGING AND MONITORING
  // ============================================================================

  /**
   * Get event log for debugging
   */
  getEventLog(): any[] {
    return this.eventEngine.getEventLog();
  }

  /**
   * Get table snapshot
   */
  getSnapshot(): any {
    return this.eventEngine.getSnapshot();
  }

  /**
   * Get active timers info
   */
  getActiveTimers(): any[] {
    return this.timerIntegration.getTimerManager().getActiveTimers();
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Cleanup resources
   */
  shutdown(): void {
    this.timerIntegration.shutdown();
    this.removeAllListeners();
    console.log(`🔗 [WebSocketAdapter] Shutdown complete for table ${this.tableId}`);
  }
}

/**
 * Factory function to create WebSocket-compatible game engine
 * Drop-in replacement for creating poker engines
 */
export function createGameEngine(
  tableId: string, 
  minBet = 10, 
  actionTimeoutSeconds = 10
): WebSocketAdapter {
  return new WebSocketAdapter(tableId, minBet, actionTimeoutSeconds);
}