/**
 * Event Engine - Replacement for GameEngine
 * 
 * Event-driven architecture with:
 * - Pure reducer functions for state updates
 * - Event queue for deterministic processing
 * - Complete event sourcing for auditability
 * - Timer integration for automated actions
 */

import { EventEmitter } from "events";
import { Table, PokerEvent, GameSnapshot, ActionType, TimerEvent } from './newTypes';
import { reduce } from './reducer';
import { validateAction, getAvailableActions } from '../logic/validation';
import { getBettingRoundState } from '../utils/ringOrder';
import { collectIntoPots, calculatePayouts, handleUncalledBet } from '../logic/potManager';
import { getNextStreet } from '../logic/betting';
import { generateHoleCards, generateBoardCards, createShuffledDeck } from './cardDealer';
import { 
  STREET_DEAL_DELAY_MS, 
  NEW_HAND_DELAY_MS, 
  GAME_START_COUNTDOWN_MS, 
  MIN_PLAYERS_TO_START 
} from './constants';

/**
 * Event queue entry for processing
 */
interface QueuedEvent {
  event: PokerEvent;
  timestamp: number;
  id: string;
}

/**
 * External command interface (from WebSocket/API)
 */
export interface GameCommand {
  type: "join" | "leave" | "action" | "start_hand";
  playerId?: string;
  seatId?: number;
  action?: ActionType;
  amount?: number;
  chips?: number;
  nickname?: string;
}

/**
 * Event Engine manages table state through pure event processing
 */
export class EventEngine extends EventEmitter {
  private table: Table;
  private eventLog: PokerEvent[] = [];
  private eventQueue: QueuedEvent[] = [];
  private processing = false;
  private processingPromise?: Promise<void>;
  private timerManager?: any; // Will be injected
  private currentDeck?: any[]; // Current shuffled deck
  private deckSeed?: string; // Seed for current deck

  constructor(tableId: string, smallBlind: number, bigBlind: number) {
    super();
    
    // Initialize table with empty state
    this.table = {
      id: tableId,
      seats: Array.from({ length: 9 }, (_, i) => ({
        id: i,
        chips: 0,
        committed: 0,
        streetCommitted: 0,
        status: "empty"
      })),
      button: 0,
      smallBlind,
      bigBlind,
      phase: "waiting",
      currentBet: 0,
      pots: [],
      communityCards: [],
      blinds: { sb: smallBlind, bb: bigBlind },
      handNumber: 0,
      timestamp: Date.now()
    };
    
    console.log(`🎮 [EventEngine] Created for table ${tableId}`);
  }

  /**
   * Get current table state (immutable)
   */
  getState(): Table {
    return { ...this.table }; // Shallow copy for immutability
  }

  /**
   * Get complete event log
   */
  getEventLog(): PokerEvent[] {
    return [...this.eventLog]; // Immutable copy
  }

  /**
   * Get game snapshot for debugging/replay
   */
  getSnapshot(): GameSnapshot {
    return {
      table: { ...this.table },
      eventLog: [...this.eventLog],
      timestamp: Date.now(),
      handNumber: this.table.handNumber
    };
  }

  /**
   * Process external command and convert to internal events
   */
  async processCommand(command: GameCommand): Promise<boolean> {
    try {
      const events = this.commandToEvents(command);
      
      for (const event of events) {
        await this.dispatch(event);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ [EventEngine] Command failed:`, error);
      this.emit('error', { command, error });
      return false;
    }
  }

  /**
   * Dispatch event for processing
   */
  async dispatch(event: PokerEvent): Promise<void> {
    console.log(`🚀 [EventEngine] Dispatching event: ${event.t} (queue length: ${this.eventQueue.length}, processing: ${this.processing})`);
    
    const queuedEvent: QueuedEvent = {
      event,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.eventQueue.push(queuedEvent);
    console.log(`   📥 Added to queue: ${event.t} (new queue length: ${this.eventQueue.length})`);
    
    // If we're already processing, just add to queue and return immediately
    // The current processing session will handle it in the while loop
    if (this.processing) {
      console.log(`   🔄 Already processing - event added to queue, will be processed in current session`);
      return;
    }
    
    // Start new processing session and wait for it to complete
    console.log(`   🎬 Starting new processing session for ${event.t}`);
    this.processingPromise = this.processEventQueue();
    
    // Wait for the processing to complete
    console.log(`   ⌛ Waiting for processing to complete for ${event.t}...`);
    await this.processingPromise;
    console.log(`   ✅ Processing completed for ${event.t}`);
    
    console.log(`🏁 [EventEngine] Dispatch complete for ${event.t}`);
  }

  /**
   * Process event queue sequentially for deterministic behavior
   */
  private async processEventQueue(): Promise<void> {
    if (this.processing) {
      console.log(`⚠️ [EventEngine] processEventQueue called while already processing - returning early`);
      return; // Already processing
    }
    
    this.processing = true;
    console.log(`🔄 [EventEngine] Starting event queue processing (${this.eventQueue.length} events queued)`);
    
    try {
      let processedCount = 0;
      // Keep processing until queue is completely empty
      // This handles events added during automatic transitions
      while (this.eventQueue.length > 0) {
        const queuedEvent = this.eventQueue.shift()!;
        processedCount++;
        console.log(`   📨 Processing event ${processedCount}: ${queuedEvent.event.t} (${this.eventQueue.length} remaining)`);
        await this.processEvent(queuedEvent);
        console.log(`   ✅ Completed event ${processedCount}: ${queuedEvent.event.t} (${this.eventQueue.length} remaining)`);
        
        // Continue processing any events that were added during processEvent
        // (e.g., from automatic transitions)
      }
      console.log(`🎯 [EventEngine] Event queue processing complete (processed ${processedCount} events total)`);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(queuedEvent: QueuedEvent): Promise<void> {
    const { event, timestamp } = queuedEvent;
    
    console.log(`📨 [EventEngine] Processing event: ${event.t}`, event);
    
    // Apply event through pure reducer
    const newTable = reduce(this.table, event);
    
    // Check if state actually changed - if not, validation failed
    if (newTable === this.table) {
      console.log(`⚠️ [EventEngine] Event ${event.t} produced no state change - validation failed`);
      
      // For PlayerJoin events, determine specific error type
      if (event.t === "PlayerJoin") {
        const seat = this.table.seats[event.seat];
        
        // Check specific validation failures
        if (event.seat < 0 || event.seat >= this.table.seats.length) {
          throw new Error("Invalid seat index");
        } else if (seat.pid) {
          throw new Error("Seat already taken");
        } else if (this.table.seats.find(s => s.pid === event.pid)) {
          throw new Error("Player already seated");
        } else if (event.chips <= 0) {
          throw new Error("Invalid chips amount");
        } else {
          throw new Error("Failed to add player");
        }
      }
      
      // For other events, throw generic validation error
      throw new Error(`Event validation failed: ${event.t}`);
    }
    
    // Update state and log event
    this.table = newTable;
    this.eventLog.push(event);
    
    // Check for automatic transitions FIRST (before emitting)
    await this.checkAutomaticTransitions();
    
    // Check if game should start after player join/leave events
    if (event.t === "PlayerJoin" || event.t === "PlayerLeave") {
      await this.checkGameStart();
    }
    
    // Start action timer if we're in a betting phase and have an active player
    this.startActionTimerIfNeeded();
    
    // Emit state change for external listeners AFTER state is fully consistent
    this.emit('stateChanged', this.table);
    this.emit('eventProcessed', event, this.table);
    
    console.log(`✅ [EventEngine] Event ${event.t} processed successfully`);
  }

  /**
   * Check for automatic state transitions after event processing
   */
  private async checkAutomaticTransitions(): Promise<void> {
    const { phase, street } = this.table;
    
    switch (phase) {
      case "preflop":
      case "flop":
      case "turn":
      case "river":
        await this.checkBettingRoundComplete();
        break;
        
      case "deal":
        await this.startBettingRounds();
        break;
        
      case "showdown":
        await this.processShowdown();
        break;
        
      case "payout":
        await this.processPayout();
        break;
        
      case "handEnd":
        // Hand complete - ready for next hand
        break;
    }
  }

  /**
   * Check if current betting round is complete and advance
   */
  private async checkBettingRoundComplete(): Promise<void> {
    const bettingState = getBettingRoundState(this.table);
    
    if (!bettingState.isComplete) {
      return; // Betting continues
    }
    
    console.log(`🔄 [EventEngine] Betting round complete: ${bettingState.reason}`);
    
    // Collect chips into pots
    await this.dispatch({ t: "CloseStreet" });
    
    // Determine next phase
    if (bettingState.reason === "fold-to-one") {
      // Skip to payout immediately - only one player left
      const distributions = handleUncalledBet(this.table);
      await this.dispatch({ t: "Payout", distributions });
      
    } else if (this.table.street === "river") {
      // River complete - go to showdown
      await this.dispatch({ t: "Showdown", results: [] });
      
    } else if (bettingState.reason === "all-players-allin") {
      // ALL players are all-in - schedule remaining streets with delays
      await this.scheduleAllInShowdown();
      
    } else {
      // Normal street advancement
      const nextStreet = getNextStreet(this.table.street!);
      if (nextStreet) {
        const cards = this.getCommunityCards(nextStreet);
        await this.dispatch({ t: "EnterStreet", street: nextStreet, cards });
      }
    }
  }

  /**
   * Start betting rounds after deal phase
   */
  private async startBettingRounds(): Promise<void> {
    console.log(`🎲 [EventEngine] Starting betting rounds from deal phase`);
    
    // Post blinds and start preflop
    console.log(`   → Dispatching PostBlinds...`);
    await this.dispatch({
      t: "PostBlinds",
      sb: this.table.blinds.sb,
      bb: this.table.blinds.bb,
      ante: this.table.blinds.ante
    });
    console.log(`   ✅ PostBlinds completed`);
    
    // Generate and deal hole cards to all active players
    console.log(`   → Generating and dispatching DealHole...`);
    const holeCards = generateHoleCards(this.table, this.getDeckSeed());
    await this.dispatch({
      t: "DealHole",
      cards: holeCards
    });
    console.log(`   ✅ DealHole completed`);
    console.log(`🎯 [EventEngine] Betting rounds setup completed`);
  }

  /**
   * Process showdown phase
   */
  private async processShowdown(): Promise<void> {
    // In a full implementation, evaluate hands here
    // For now, create mock results
    const mockResults = this.createMockShowdownResults();
    
    const distributions = calculatePayouts(this.table.pots, mockResults);
    await this.dispatch({ t: "Payout", distributions });
  }

  /**
   * Schedule remaining streets when all players are all-in
   */
  private async scheduleAllInShowdown(): Promise<void> {
    const remainingStreets = this.getRemainingStreets();
    let delay = 0;
    
    console.log(`🎯 [EventEngine] Scheduling all-in showdown for streets: ${remainingStreets.join(', ')}`);
    
    for (const street of remainingStreets) {
      delay += STREET_DEAL_DELAY_MS;
      
      setTimeout(() => {
        const cards = this.getCommunityCards(street);
        this.dispatch({ 
          t: "EnterStreet", 
          street: street as any, 
          cards, 
          isAutoDealt: true 
        });
      }, delay);
    }
    
    // Schedule showdown after all streets
    setTimeout(() => {
      this.dispatch({ t: "Showdown", results: [] });
    }, delay + STREET_DEAL_DELAY_MS);
  }

  /**
   * Get remaining streets to deal for all-in showdown
   */
  private getRemainingStreets(): string[] {
    const currentStreet = this.table.street;
    const allStreets = ["preflop", "flop", "turn", "river"];
    const currentIndex = currentStreet ? allStreets.indexOf(currentStreet) : -1;
    
    if (currentIndex === -1) return allStreets.slice(1); // Start from flop if no street
    
    return allStreets.slice(currentIndex + 1);
  }

  /**
   * Process payout phase with delay before next hand
   */
  private async processPayout(): Promise<void> {
    console.log(`💰 [EventEngine] Processing payout, scheduling next hand in ${NEW_HAND_DELAY_MS}ms`);
    
    // Schedule next hand with delay
    setTimeout(() => {
      this.dispatch({ t: "HandEnd" });
      // Reset deck for next hand
      this.resetDeck();
    }, NEW_HAND_DELAY_MS);
  }

  /**
   * Convert external commands to internal events
   */
  private commandToEvents(command: GameCommand): PokerEvent[] {
    switch (command.type) {
      case "join":
        if (command.playerId && command.seatId !== undefined && command.chips) {
          return [{
            t: "PlayerJoin",
            seat: command.seatId,
            pid: command.playerId,
            chips: command.chips,
            nickname: command.nickname
          }];
        }
        break;
        
      case "leave":
        if (command.playerId && command.seatId !== undefined) {
          return [{
            t: "PlayerLeave",
            seat: command.seatId,
            pid: command.playerId
          }];
        }
        break;
        
      case "action":
        if (command.seatId !== undefined && command.action) {
          return [{
            t: "Action",
            seat: command.seatId,
            action: command.action,
            amount: command.amount
          }];
        }
        break;
        
      case "start_hand":
        return [{
          t: "StartHand",
          handNumber: this.table.handNumber + 1,
          timestamp: Date.now()
        }];
    }
    
    return [];
  }

  /**
   * Check if game should start and initiate countdown
   */
  private async checkGameStart(): Promise<void> {
    const playerCount = this.table.seats.filter(s => s.pid).length;
    
    console.log(`🎮 [EventEngine] Checking game start: ${playerCount}/${MIN_PLAYERS_TO_START} players`);
    
    if (playerCount >= MIN_PLAYERS_TO_START && this.table.phase === "waiting") {
      console.log(`🚀 [EventEngine] Starting game countdown: ${GAME_START_COUNTDOWN_MS}ms`);
      
      // Emit countdown event for clients
      this.emit('gameStartCountdown', { 
        seconds: GAME_START_COUNTDOWN_MS / 1000,
        playerCount 
      });
      
      setTimeout(() => {
        const currentPlayerCount = this.table.seats.filter(s => s.pid).length;
        if (currentPlayerCount >= MIN_PLAYERS_TO_START && this.table.phase === "waiting") {
          console.log(`✅ [EventEngine] Countdown complete, starting hand with ${currentPlayerCount} players`);
          this.dispatch({ 
            t: "StartHand", 
            handNumber: this.table.handNumber + 1, 
            timestamp: Date.now() 
          });
        } else {
          console.log(`❌ [EventEngine] Countdown cancelled - insufficient players or game already started`);
        }
      }, GAME_START_COUNTDOWN_MS);
    }
  }

  /**
   * Get community cards for street transitions
   */
  private getCommunityCards(street: string): number[] {
    // Generate real community cards using the deck
    if (!this.currentDeck) {
      console.warn("⚠️ [EventEngine] No deck available for community cards");
      return [];
    }
    
    return generateBoardCards(street as any, this.currentDeck, true);
  }

  /**
   * Create mock showdown results for testing
   */
  private createMockShowdownResults(): Array<{ pid: string; rank: number; description: string }> {
    const playersInHand = this.table.seats.filter(seat => 
      seat.pid && (seat.status === "active" || seat.status === "allin")
    );
    
    return playersInHand.map((seat, index) => ({
      pid: seat.pid!,
      rank: index + 1, // Lower is better
      description: `Mock hand #${index + 1}`
    }));
  }

  /**
   * Set timer manager for automated actions
   */
  setTimerManager(timerManager: any): void {
    this.timerManager = timerManager;
    
    // Listen for timer events
    this.timerManager?.on('timeout', (data: TimerEvent) => {
      this.dispatch({
        t: "TimeoutAutoFold",
        seat: data.seat
      });
    });
  }

  /**
   * Start action timer for current player
   */
  private startActionTimer(): void {
    if (!this.timerManager || this.table.actor === undefined) {
      return;
    }
    
    const seat = this.table.seats[this.table.actor];
    if (!seat.pid) {
      return;
    }
    
    const timerData: TimerEvent = {
      pid: seat.pid,
      seat: this.table.actor,
      deadline: Date.now() + 30000, // 30 second timer
      actionTimeoutMs: 30000
    };
    
    this.timerManager.startTimer(timerData);
  }

  /**
   * Generate a new deck seed for the current hand
   */
  private generateDeckSeed(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the current deck seed (or generate one if needed)
   */
  private getDeckSeed(): string {
    if (!this.deckSeed) {
      this.deckSeed = this.generateDeckSeed();
      this.currentDeck = createShuffledDeck(this.deckSeed);
      console.log(`🎰 [EventEngine] Created new deck with seed: ${this.deckSeed}`);
    }
    return this.deckSeed;
  }

  /**
   * Reset deck for new hand
   */
  private resetDeck(): void {
    this.deckSeed = undefined;
    this.currentDeck = undefined;
  }

  /**
   * Start action timer if we're in a betting phase with an active player
   */
  private startActionTimerIfNeeded(): void {
    const bettingPhases = ["preflop", "flop", "turn", "river"];
    
    if (!bettingPhases.includes(this.table.phase) || this.table.actor === undefined) {
      return; // Not in betting phase or no active player
    }
    
    const currentSeat = this.table.seats[this.table.actor];
    if (!currentSeat.pid || currentSeat.status !== "active") {
      return; // Invalid current player
    }
    
    console.log(`⏰ [EventEngine] Starting action timer for player ${currentSeat.pid} (seat ${this.table.actor})`);
    this.startActionTimer();
  }

  /**
   * Legacy compatibility methods
   */
  
  // Add player (legacy interface)
  addPlayer(playerData: { id: string; seat: number; chips: number; nickname?: string }): boolean {
    this.dispatch({
      t: "PlayerJoin",
      seat: playerData.seat,
      pid: playerData.id,
      chips: playerData.chips,
      nickname: playerData.nickname
    });
    return true;
  }
  
  // Remove player (legacy interface)  
  removePlayer(playerId: string): boolean {
    const seat = this.table.seats.find(s => s.pid === playerId);
    if (seat) {
      this.dispatch({
        t: "PlayerLeave",
        seat: seat.id,
        pid: playerId
      });
      return true;
    }
    return false;
  }
  
  // Handle action (legacy interface)
  handleAction(playerId: string, action: { type: string; amount?: number }): boolean {
    const seat = this.table.seats.find(s => s.pid === playerId);
    if (!seat) {
      return false;
    }
    
    this.dispatch({
      t: "Action",
      seat: seat.id,
      action: action.type as ActionType,
      amount: action.amount
    });
    
    return true;
  }
  
  // Start hand (legacy interface)
  startHand(): void {
    this.dispatch({
      t: "StartHand",
      handNumber: this.table.handNumber + 1,
      timestamp: Date.now()
    });
  }
}