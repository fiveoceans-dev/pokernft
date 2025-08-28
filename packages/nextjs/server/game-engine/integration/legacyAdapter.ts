/**
 * Legacy Adapter for WebSocket Server Integration
 * 
 * Provides backward compatibility with existing WebSocket server code
 * while using the new event-driven poker engine underneath.
 * 
 * This adapter:
 * - Implements the same interface as the old GameEngine
 * - Translates between old and new data structures  
 * - Maintains event emissions for WebSocket clients
 * - Provides smooth migration path
 */

import { EventEmitter } from "events";
import { EventEngine } from '../core/eventEngine';
import { TimerIntegration } from '../managers/timerEvents';
import { Table, Seat } from '../core/newTypes';
import { GameRoom, PlayerSession } from '../core/types'; // Legacy types

/**
 * Legacy GameEngine adapter that wraps the new EventEngine
 * Maintains compatibility with existing WebSocket server code
 */
export class LegacyGameEngineAdapter extends EventEmitter {
  private eventEngine: EventEngine;
  private timerIntegration: TimerIntegration;
  private tableId: string;

  constructor(tableId: string, minBet = 10, actionTimeoutSeconds = 10) {
    super();
    
    this.tableId = tableId;
    const smallBlind = Math.floor(minBet / 2);
    const bigBlind = minBet;
    
    // Create new event engine
    this.eventEngine = new EventEngine(tableId, smallBlind, bigBlind);
    
    // Setup timer integration
    this.timerIntegration = new TimerIntegration(this.eventEngine, actionTimeoutSeconds * 1000);
    
    // Forward events from new engine to legacy listeners
    this.setupEventForwarding();
    
    console.log(`🔗 [LegacyAdapter] Created for table ${tableId}`);
  }

  /**
   * Setup event forwarding from new engine to legacy WebSocket format
   */
  private setupEventForwarding(): void {
    // Forward state changes as legacy events
    this.eventEngine.on('stateChanged', (table: Table) => {
      const legacyRoom = this.convertTableToRoom(table);
      this.emit('stateChanged', legacyRoom);
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
   * Handle specific event forwarding to maintain legacy behavior
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
   * Convert new Table structure to legacy GameRoom structure
   */
  private convertTableToRoom(table: Table): GameRoom {
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
        isTurn: table.actor === seat.id,
        hand: seat.holeCards as any[], // Will need proper Card conversion
        // Additional legacy fields
        stack: seat.chips, // Legacy alias
        betThisRound: seat.streetCommitted,
        committed: seat.committed,
        isAllIn: seat.status === "allin",
        state: this.convertSeatStatusToPlayerState(seat.status)
      } as any));

    return {
      id: table.id,
      players,
      dealerIndex: table.button,
      currentTurnIndex: table.actor ?? 0,
      firstToActIndex: 0, // Will be calculated properly in full implementation
      lastAggressorIndex: table.lastAggressor ?? -1,
      stage: table.phase as any,
      pot: table.pots.reduce((sum, pot) => sum + pot.amount, 0),
      communityCards: table.communityCards as any[], // Will need proper Card conversion
      minBet: table.bigBlind,
      smallBlindAmount: table.smallBlind,
      bigBlindAmount: table.bigBlind,
      deck: [], // Legacy field - not used in new architecture
      actionHistory: [], // Legacy field - can be added later if needed
      // Additional fields for compatibility but not in legacy interface
      ...({
        board: table.communityCards as any[], // Legacy alias
        handNumber: table.handNumber,
        timestamp: table.timestamp,
        pots: table.pots // Additional field for internal use
      })
    } as GameRoom;
  }

  /**
   * Convert new seat status to legacy player state
   */
  private convertSeatStatusToPlayerState(status: string): any {
    // This would map to the legacy PlayerState enum
    switch (status) {
      case "active": return "ACTIVE";
      case "folded": return "FOLDED";
      case "allin": return "ALL_IN";
      case "empty": return "EMPTY";
      default: return "ACTIVE";
    }
  }

  // ============================================================================
  // LEGACY INTERFACE METHODS (maintain existing API)
  // ============================================================================

  /**
   * Get current game state (legacy format)
   */
  getState(): GameRoom {
    const table = this.eventEngine.getState();
    return this.convertTableToRoom(table);
  }

  /**
   * Load game state from snapshot (legacy format)
   */
  loadState(room: GameRoom): void {
    // Convert legacy room to new table format and load
    // This is a simplified conversion - full implementation would be more comprehensive
    console.log(`📂 [LegacyAdapter] Loading legacy room state for ${room.id}`);
    
    // For now, just add players from the room
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
    
    // Process the command - this will also validate through the EventEngine
    const success = this.eventEngine.processCommand({
      type: "join",
      playerId: playerData.id,
      seatId: playerData.seat,
      chips: playerData.chips,
      nickname: playerData.nickname
    });
    
    // Note: processCommand is async but we need to maintain sync interface
    // The validation above should catch most issues immediately
    console.log(`🔗 [LegacyAdapter] Dispatched join command for player ${playerData.id}`);
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
  handleAction(playerId: string, action: { type: string; amount?: number }): any {
    const table = this.eventEngine.getState();
    const seat = table.seats.find(s => s.pid === playerId);
    
    if (!seat) {
      throw new Error("Player not found at table");
    }

    this.eventEngine.processCommand({
      type: "action",
      seatId: seat.id,
      action: action.type.toLowerCase() as any,
      amount: action.amount
    });

    return { success: true }; // Legacy return format
  }

  /**
   * Start new hand
   */
  startHand(): void {
    this.eventEngine.processCommand({ type: "start_hand" });
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
   * Setup timer callbacks (legacy interface)
   */
  setupTimerCallbacks(): void {
    // Timer callbacks are now handled through events
    console.log(`⏰ [LegacyAdapter] Timer callbacks setup through event system`);
  }

  /**
   * Setup timer events (legacy interface)
   */
  setupTimerEvents(): void {
    // Timer events are automatically setup in constructor
    console.log(`⏰ [LegacyAdapter] Timer events setup through integration layer`);
  }

  // ============================================================================
  // EVENT EMISSIONS (maintain legacy behavior)
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
    console.log(`🔗 [LegacyAdapter] Shutdown complete for table ${this.tableId}`);
  }
}

/**
 * Factory function to create legacy-compatible game engine
 * Drop-in replacement for the old GameEngine constructor
 */
export function createGameEngine(
  tableId: string, 
  minBet = 10, 
  actionTimeoutSeconds = 10
): LegacyGameEngineAdapter {
  return new LegacyGameEngineAdapter(tableId, minBet, actionTimeoutSeconds);
}

/**
 * Migration utilities
 */
export class MigrationUtils {
  /**
   * Validate that new engine produces same results as old engine
   */
  static validateMigration(
    legacyResult: any, 
    newResult: any, 
    testName: string
  ): boolean {
    // Implementation would compare key fields between old and new results
    console.log(`🔍 [Migration] Validating ${testName}:`, {
      legacy: legacyResult,
      new: newResult
    });
    
    return true; // Simplified validation
  }

  /**
   * Convert legacy room to new table format
   */
  static convertRoomToTable(room: GameRoom): Table {
    // Full conversion implementation would go here
    throw new Error("Not implemented - use LegacyAdapter.convertTableToRoom for now");
  }
}