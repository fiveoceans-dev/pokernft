/**
 * Event-Driven Poker Engine
 *
 * Core engine with event-sourced architecture featuring:
 * - Pure reducer functions for state updates
 * - Event queue for deterministic processing
 * - Complete event sourcing for auditability
 * - Timer integration for automated actions
 */

import { EventEmitter } from "events";
import {
  Table,
  PokerEvent,
  GameSnapshot,
  ActionType,
  TimerEvent,
  StateTransition,
  SideEffect,
} from "./types";
import { reduce } from "./reducer";
import { validateAction, getAvailableActions } from "../logic/validation";
import { getBettingRoundState } from "../utils/ringOrder";
import { calculatePayouts, handleUncalledBet } from "../logic/potManager";
import { getNextStreet } from "../logic/betting";
import {
  generateHoleCards,
  generateBoardCards,
  createShuffledDeck,
} from "./cardDealer";
import {
  STREET_DEAL_DELAY_MS,
  NEW_HAND_DELAY_MS,
  GAME_START_COUNTDOWN_MS,
  MIN_PLAYERS_TO_START,
} from "./constants";

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
  // Note: Transition logic now handled by reducer through side effects

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
        status: "empty",
      })),
      button: 0,
      smallBlind,
      bigBlind,
      phase: "waiting",
      currentBet: 0,
      lastRaiseSize: bigBlind,
      pots: [],
      communityCards: [],
      blinds: { sb: smallBlind, bb: bigBlind },
      handNumber: 0,
      timestamp: Date.now(),
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
      handNumber: this.table.handNumber,
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
      this.emit("error", { command, error });
      return false;
    }
  }

  /**
   * Dispatch event for processing
   */
  async dispatch(event: PokerEvent): Promise<void> {
    console.log(
      `🚀 [EventEngine] Dispatching event: ${event.t} (queue length: ${this.eventQueue.length}, processing: ${this.processing})`,
    );

    // Check for excessive queueing (indicates logic error)
    if (this.eventQueue.length > 50) {
      console.error(
        `❌ Event queue overflow! ${this.eventQueue.length} events queued`,
      );
      console.error(
        `Queue contents:`,
        this.eventQueue.map((e) => e.event.t),
      );

      // Clear queue and reset state machine
      this.eventQueue = [];
      this.processing = false;

      throw new Error(`Event queue overflow - possible infinite loop detected`);
    }

    const queuedEvent: QueuedEvent = {
      event,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.eventQueue.push(queuedEvent);
    console.log(
      `   📥 Added to queue: ${event.t} (new queue length: ${this.eventQueue.length})`,
    );

    // If we're already processing, just add to queue and return immediately
    // The current processing session will handle it in the while loop
    if (this.processing) {
      console.log(
        `   🔄 Already processing - event added to queue, will be processed in current session`,
      );
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
      console.log(
        `⚠️ [EventEngine] processEventQueue called while already processing - returning early`,
      );
      return; // Already processing
    }

    this.processing = true;
    console.log(
      `🔄 [EventEngine] Starting event queue processing (${this.eventQueue.length} events queued)`,
    );

    try {
      let processedCount = 0;
      // Keep processing until queue is completely empty
      // This handles events added during automatic transitions
      while (this.eventQueue.length > 0) {
        const queuedEvent = this.eventQueue.shift()!;
        processedCount++;
        console.log(
          `   📨 Processing event ${processedCount}: ${queuedEvent.event.t} (${this.eventQueue.length} remaining)`,
        );
        await this.processEvent(queuedEvent);
        console.log(
          `   ✅ Completed event ${processedCount}: ${queuedEvent.event.t} (${this.eventQueue.length} remaining)`,
        );

        // Continue processing any events that were added during processEvent
        // (e.g., from automatic transitions)
      }
      console.log(
        `🎯 [EventEngine] Event queue processing complete (processed ${processedCount} events total)`,
      );
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(queuedEvent: QueuedEvent): Promise<void> {
    const { event, timestamp } = queuedEvent;

    // Clear event processing state on new hand
    if (event.t === "StartHand") {
      console.log(`🧹 [EventEngine] Starting new hand ${event.handNumber}`);
    }

    // Enhanced logging for player events
    if (event.t === "PlayerJoin") {
      console.log(
        `👤 [EventEngine] Processing PlayerJoin for ${event.pid} at seat ${event.seat}`,
      );
    }

    // Add phase-specific validation to prevent wrong-phase events
    if (event.t === "Payout" && this.table.phase !== "showdown") {
      console.warn(
        `⚠️ [EventEngine] Ignoring Payout event in wrong phase: ${this.table.phase}`,
      );
      return;
    }

    if (event.t === "HandEnd" && this.table.phase === "waiting") {
      console.warn(
        `⚠️ [EventEngine] Ignoring HandEnd - already in waiting phase`,
      );
      return;
    }

    console.log(`📨 [EventEngine] Processing event: ${event.t}`, event);

    // IMMEDIATE timer cancellation for actions to prevent race conditions
    if (event.t === "Action" && this.timerManager) {
      const seat = this.table.seats[event.seat];
      if (seat?.pid && this.table.actor === event.seat) {
        console.log(
          `⏰ [EventEngine] Immediately cancelling timer for acting player ${seat.pid} at seat ${event.seat}`,
        );
        this.timerManager.clearTimer(seat.pid);
      }
    }

    // Apply event through pure reducer
    const transition = reduce(this.table, event);

    // Check if state actually changed - if not, validation failed
    if (transition.nextState === this.table) {
      console.log(
        `⚠️ [EventEngine] Event ${event.t} produced no state change - validation failed`,
      );

      // For PlayerJoin events, determine specific error type
      if (event.t === "PlayerJoin") {
        const seat = this.table.seats[event.seat];

        // Check specific validation failures
        if (event.seat < 0 || event.seat >= this.table.seats.length) {
          throw new Error("Invalid seat index");
        } else if (seat.pid) {
          throw new Error("Seat already taken");
        } else if (this.table.seats.find((s) => s.pid === event.pid)) {
          throw new Error("Player already seated");
        } else if (event.chips <= 0) {
          throw new Error("Invalid chips amount");
        } else {
          throw new Error("Failed to add player");
        }
      }

      // Special handling for TimeoutAutoFold - race conditions are expected
      if (event.t === "TimeoutAutoFold") {
        console.warn(
          `⏰ [EventEngine] TimeoutAutoFold for seat ${event.seat} had no effect - player likely already acted or not current actor`,
        );
        // Don't throw error - this is expected behavior when timers race
        // Just execute any side effects (like notifications) and continue
        await this.executeSideEffects(transition.sideEffects);
        this.emit("eventProcessed", event, this.table);
        return;
      }

      // For other events, throw generic validation error
      throw new Error(`Event validation failed: ${event.t}`);
    }

    // Update state and log event
    this.table = transition.nextState;
    this.eventLog.push(event);

    // Execute side effects returned by the reducer
    await this.executeSideEffects(transition.sideEffects);

    // Check if game should start after player join/leave events
    if (event.t === "PlayerJoin" || event.t === "PlayerLeave") {
      await this.checkGameStart();
    }

    // Log actor state for debugging (transitions now handled by reducer)
    if (this.table.actor === undefined || this.table.actor === -1) {
      console.warn(
        `⚠️ [EventEngine] Invalid actor after state update: ${this.table.actor} in phase: ${this.table.phase}`,
      );
      // Note: State transitions are now handled by the reducer through side effects
    }

    // Start action timer if we're in a betting phase and have an active player
    this.startActionTimerIfNeeded();

    // Emit state change for external listeners AFTER state is fully consistent
    this.emit("stateChanged", this.table);
    this.emit("eventProcessed", event, this.table);

    console.log(`✅ [EventEngine] Event ${event.t} processed successfully`);
  }

  // Note: Automatic transitions now handled by reducer through side effects

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
      ante: this.table.blinds.ante,
    });
    console.log(`   ✅ PostBlinds completed`);

    // Generate and deal hole cards to all active players
    console.log(`   → Generating and dispatching DealHole...`);
    const holeCards = generateHoleCards(this.table, this.getDeckSeed());
    await this.dispatch({
      t: "DealHole",
      cards: holeCards,
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

    console.log(
      `🎯 [EventEngine] Scheduling all-in showdown for streets: ${remainingStreets.join(", ")}`,
    );

    // Schedule streets with proper async delays
    for (const street of remainingStreets) {
      console.log(
        `   ⏱️ Waiting ${STREET_DEAL_DELAY_MS}ms before dealing ${street}...`,
      );
      await this.delay(STREET_DEAL_DELAY_MS);

      const cards = this.getCommunityCards(street);
      await this.dispatch({
        t: "EnterStreet",
        street: street as any,
        cards,
        isAutoDealt: true,
      });
    }

    // Schedule showdown after all streets with final delay
    console.log(`   ⏱️ Waiting ${STREET_DEAL_DELAY_MS}ms before showdown...`);
    await this.delay(STREET_DEAL_DELAY_MS);
    await this.dispatch({ t: "Showdown", results: [] });
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
   * NOTE: This method should NOT be called from checkAutomaticTransitions to prevent loops
   */
  private async processPayout(): Promise<void> {
    console.log(
      `💰 [EventEngine] Payout complete, waiting ${NEW_HAND_DELAY_MS}ms before signaling ready`,
    );

    // Just wait for the delay - don't dispatch HandEnd here
    // HandEnd will be dispatched by the reducer when processing the Payout event
    await this.delay(NEW_HAND_DELAY_MS);

    // Reset deck for next hand
    this.resetDeck();

    // Emit ready for new hand instead of dispatching events
    this.emit("readyForNewHand");
    console.log(`🔄 [EventEngine] Ready for new hand after payout delay`);
  }

  /**
   * Convert external commands to internal events
   */
  private commandToEvents(command: GameCommand): PokerEvent[] {
    switch (command.type) {
      case "join":
        if (command.playerId && command.seatId !== undefined && command.chips) {
          return [
            {
              t: "PlayerJoin",
              seat: command.seatId,
              pid: command.playerId,
              chips: command.chips,
              nickname: command.nickname,
            },
          ];
        }
        break;

      case "leave":
        if (command.playerId && command.seatId !== undefined) {
          return [
            {
              t: "PlayerLeave",
              seat: command.seatId,
              pid: command.playerId,
            },
          ];
        }
        break;

      case "action":
        if (command.seatId !== undefined && command.action) {
          return [
            {
              t: "Action",
              seat: command.seatId,
              action: command.action,
              amount: command.amount,
            },
          ];
        }
        break;

      case "start_hand":
        return [
          {
            t: "StartHand",
            handNumber: this.table.handNumber + 1,
            timestamp: Date.now(),
          },
        ];
    }

    return [];
  }

  /**
   * Check if game should start and initiate countdown
   */
  private async checkGameStart(): Promise<void> {
    const playerCount = this.table.seats.filter((s) => s.pid).length;

    console.log(
      `🎮 [EventEngine] Checking game start: ${playerCount}/${MIN_PLAYERS_TO_START} players`,
    );

    if (playerCount >= MIN_PLAYERS_TO_START && this.table.phase === "waiting") {
      console.log(
        `🚀 [EventEngine] Starting game countdown: ${GAME_START_COUNTDOWN_MS}ms`,
      );

      // Emit countdown event for clients
      this.emit("gameStartCountdown", {
        seconds: GAME_START_COUNTDOWN_MS / 1000,
        playerCount,
      });

      // Use async countdown - don't block other operations
      this.scheduleGameStart();
    }
  }

  /**
   * Schedule game start with countdown (runs in background)
   */
  private async scheduleGameStart(): Promise<void> {
    console.log(
      `⏰ [EventEngine] Waiting ${GAME_START_COUNTDOWN_MS}ms before starting game...`,
    );
    await this.delay(GAME_START_COUNTDOWN_MS);

    const currentPlayerCount = this.table.seats.filter((s) => s.pid).length;
    if (
      currentPlayerCount >= MIN_PLAYERS_TO_START &&
      this.table.phase === "waiting"
    ) {
      console.log(
        `✅ [EventEngine] Countdown complete, starting hand with ${currentPlayerCount} players`,
      );
      await this.dispatch({
        t: "StartHand",
        handNumber: this.table.handNumber + 1,
        timestamp: Date.now(),
      });
    } else {
      console.log(
        `❌ [EventEngine] Countdown cancelled - insufficient players or game already started`,
      );
    }
  }

  /**
   * Promise-based delay utility for timing
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
  private createMockShowdownResults(): Array<{
    pid: string;
    rank: number;
    description: string;
  }> {
    const playersInHand = this.table.seats.filter(
      (seat) =>
        seat.pid && (seat.status === "active" || seat.status === "allin"),
    );

    return playersInHand.map((seat, index) => ({
      pid: seat.pid!,
      rank: index + 1, // Lower is better
      description: `Mock hand #${index + 1}`,
    }));
  }

  /**
   * Set timer manager for automated actions
   */
  setTimerManager(timerIntegration: any): void {
    this.timerManager = timerIntegration; // Store integration, not just manager
    console.log(`⏰ [EventEngine] Timer connected to state machine`);

    // Timer events are handled through TimerIntegration, not directly here
  }

  /**
   * Start action timer for current player
   */
  private startActionTimer(): void {
    if (!this.timerManager || this.table.actor === undefined) {
      console.error(
        `❌ [EventEngine] Timer not initialized or no actor: timer=${!!this.timerManager}, actor=${this.table.actor}`,
      );
      return;
    }

    const seat = this.table.seats[this.table.actor];
    if (!seat?.pid) {
      return;
    }

    // Call correct method on TimerIntegration
    this.timerManager.startActionTimer(seat.pid, this.table.actor);
    console.log(
      `⏰ [EventEngine] Started timer for ${seat.pid} at seat ${this.table.actor}`,
    );
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
      console.log(
        `🎰 [EventEngine] Created new deck with seed: ${this.deckSeed}`,
      );
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

    if (
      !bettingPhases.includes(this.table.phase) ||
      this.table.actor === undefined
    ) {
      return; // Not in betting phase or no active player
    }

    const currentSeat = this.table.seats[this.table.actor];
    if (!currentSeat.pid || currentSeat.status !== "active") {
      return; // Invalid current player
    }

    console.log(
      `⏰ [EventEngine] Starting action timer for player ${currentSeat.pid} (seat ${this.table.actor})`,
    );
    this.startActionTimer();
  }

  /**
   * Legacy compatibility methods
   */

  // Add player (legacy interface)
  addPlayer(playerData: {
    id: string;
    seat: number;
    chips: number;
    nickname?: string;
  }): boolean {
    this.dispatch({
      t: "PlayerJoin",
      seat: playerData.seat,
      pid: playerData.id,
      chips: playerData.chips,
      nickname: playerData.nickname,
    });
    return true;
  }

  // Remove player (legacy interface)
  removePlayer(playerId: string): boolean {
    const seat = this.table.seats.find((s) => s.pid === playerId);
    if (seat) {
      this.dispatch({
        t: "PlayerLeave",
        seat: seat.id,
        pid: playerId,
      });
      return true;
    }
    return false;
  }

  // Handle action (legacy interface)
  handleAction(
    playerId: string,
    action: { type: string; amount?: number },
  ): boolean {
    const seat = this.table.seats.find((s) => s.pid === playerId);
    if (!seat) {
      return false;
    }

    this.dispatch({
      t: "Action",
      seat: seat.id,
      action: action.type as ActionType,
      amount: action.amount,
    });

    return true;
  }

  // Start hand (legacy interface)
  startHand(): void {
    this.dispatch({
      t: "StartHand",
      handNumber: this.table.handNumber + 1,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute side effects returned by the reducer
   */
  private async executeSideEffects(sideEffects: SideEffect[]): Promise<void> {
    for (const effect of sideEffects) {
      await this.executeSideEffect(effect);
    }
  }

  /**
   * Execute individual side effect
   */
  private async executeSideEffect(effect: SideEffect): Promise<void> {
    console.log(
      `🔄 [EventEngine] Executing side effect: ${effect.type}`,
      effect.payload,
    );

    switch (effect.type) {
      case "START_TIMER":
        if (this.timerManager) {
          const { playerId, seatId, timeoutMs } = effect.payload;
          this.timerManager.startActionTimer(playerId, seatId, timeoutMs);
        }
        break;

      case "STOP_TIMER":
        if (this.timerManager) {
          const { playerId } = effect.payload;
          if (playerId) {
            this.timerManager.clearTimer(playerId);
          } else {
            this.timerManager.clearAllTimers();
          }
        }
        break;

      case "DISPATCH_EVENT":
        const { event, delayMs } = effect.payload;
        if (delayMs) {
          await this.delay(delayMs);
        }
        await this.dispatch(event);
        break;

      case "EMIT_STATE_CHANGE":
        const { reason } = effect.payload;
        console.log(`📡 [EventEngine] Emitting state change: ${reason}`);
        this.emit("stateChanged", this.table);
        this.emit("eventProcessed", reason, this.table);
        break;

      case "SCHEDULE_TRANSITION":
        const { toPhase, delayMs: transitionDelay } = effect.payload;
        console.log(
          `⏰ [EventEngine] Scheduling transition to ${toPhase} in ${transitionDelay}ms`,
        );
        setTimeout(() => {
          this.table = { ...this.table, phase: toPhase };
          this.emit("stateChanged", this.table);
        }, transitionDelay);
        break;

      case "CLEAR_TIMERS":
        if (this.timerManager) {
          this.timerManager.clearAllTimers();
        }
        break;

      default:
        console.warn(`⚠️ [EventEngine] Unknown side effect type:`, effect);
        break;
    }
  }
}
