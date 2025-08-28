import { EventEmitter } from "events";
import { GameRoom, PlayerSession, RoomActionType } from "../core/types";
import { TurnOrderManager } from "./TurnOrderManager";
import { BettingRoundState, BettingState } from "./BettingRoundState";
import { PositionManager } from "./PositionManager";
import { ActionValidator } from "./ActionValidator";
import { TimerManager } from "./TimerManager";
import { dealDeck, draw } from "../utils/utils";

/**
 * Action processing result
 */
interface ActionResult {
  success: boolean;
  error?: string;
  nextPlayer?: PlayerSession;
  roundComplete?: boolean;
  gameComplete?: boolean;
}

/**
 * Unified game controller that manages all game logic using data structures
 * Replaces scattered logic with centralized, structured approach
 */
export class GameController extends EventEmitter {
  private room: GameRoom;
  private turnOrder!: TurnOrderManager;
  private bettingState!: BettingRoundState;
  private positions!: PositionManager;
  private actionValidator!: ActionValidator;
  private timerManager: TimerManager;

  constructor(room: GameRoom) {
    super();
    this.room = room;
    this.timerManager = new TimerManager();
    this.setupTimerErrorHandling();
    this.initializeStructures();
  }

  /**
   * Setup error handling for timer callbacks
   */
  private setupTimerErrorHandling(): void {
    this.timerManager.on('timeout-callback-error', (data: { playerId: string, error: any }) => {
      console.error(`🚨 [GameController] Timer callback error for ${data.playerId}, attempting recovery:`, data.error);
      
      // Try to force fold the player as last resort
      try {
        const player = this.room.players.find(p => p.id === data.playerId);
        if (player && !player.hasFolded) {
          console.log(`🔧 [GameController] Force folding ${data.playerId} after timer callback failure`);
          
          // Directly modify player state and advance turn
          player.hasFolded = true;
          this.room.actionHistory.push({
            playerId: data.playerId,
            action: "fold",
            amount: 0,
            timestamp: Date.now(),
            stage: this.room.stage
          });
          
          // Advance to next player
          this.turnOrder.next();
          
          // Check if betting round is complete
          if (this.bettingState.isComplete()) {
            console.log(`✅ [GameController] Betting round complete after forced fold recovery`);
            // Emit state change to notify game progression
            this.emit('state-changed');
          }
          
          console.log(`✅ [GameController] Recovery successful: ${data.playerId} folded and turn advanced`);
        }
      } catch (recoveryError) {
        console.error(`💀 [GameController] CRITICAL: Recovery failed after timer callback error:`, recoveryError);
        // Emit state change as absolute last resort
        this.emit('state-changed');
      }
    });
  }

  /**
   * Set action timeout for timer manager
   */
  public setActionTimeout(timeoutMs: number): void {
    this.timerManager.setActionTimeout(timeoutMs);
  }

  /**
   * Initialize all data structures
   */
  private initializeStructures(): void {
    this.positions = new PositionManager(this.room);
    this.turnOrder = new TurnOrderManager(this.room);
    this.bettingState = new BettingRoundState(this.room);
    this.actionValidator = new ActionValidator(this.room, this.bettingState);
  }

  /**
   * Start a new hand
   */
  public startNewHand(): void {
    // console.log(`🆕 [${this.room.id}] Starting new hand with GameController`);
    
    // Check minimum players
    if (this.room.players.length < 2) {
      this.room.stage = "waiting";
      console.log(`⚠️ [${this.room.id}] Not enough players for hand, waiting...`);
      return;
    }
    
    // Filter out busted players
    const playersBeforeFilter = this.room.players.length;
    this.room.players = this.room.players.filter((p) => p.chips > 0);
    
    if (this.room.players.length !== playersBeforeFilter) {
      console.log(`👋 [${this.room.id}] Removed ${playersBeforeFilter - this.room.players.length} busted players`);
    }
    
    if (this.room.players.length < 2) {
      this.room.stage = "waiting";
      console.log(`⚠️ [${this.room.id}] Not enough players after removing busted players, waiting...`);
      return;
    }

    // Shuffle deck and reset room state
    this.room.deck = dealDeck();
    this.room.pot = 0;
    this.room.communityCards = [];
    this.room.actionHistory = [];
    this.room.stage = "preflop";

    // Reset player states
    this.room.players.forEach(player => {
      player.currentBet = 0;
      player.isTurn = false;
      player.hasFolded = false;
      player.isDealer = false;
    });

    // Initialize structures for new hand
    this.positions.refresh();
    
    // Post blinds
    const blindResult = this.positions.postBlinds();
    console.log(`💰 [${this.room.id}] Blinds posted: SB $${blindResult.smallBlindAmount}, BB $${blindResult.bigBlindAmount}`);

    // Deal hole cards to all players
    this.room.players.forEach(player => {
      player.hand = [draw(this.room.deck), draw(this.room.deck)];
    });
    console.log(`🃏 [${this.room.id}] Dealt hole cards to ${this.room.players.length} players`);

    // Set up turn order and betting state
    this.turnOrder.reset();
    this.bettingState.reset();

    // Set current player
    this.updateCurrentPlayer();
    
    // Start action timer for first player
    this.startActionTimer();
  }

  /**
   * Process a player action
   */
  public processAction(
    playerId: string, 
    action: RoomActionType, 
    amount?: number
  ): ActionResult {
    
    // Clear action timer since player acted
    this.timerManager.clearActionTimer();
    
    const playerIndex = this.room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: "Player not found" };
    }

    // Validate action
    const validation = this.actionValidator.validateAction(playerIndex, action, amount);
    if (!validation.isValid) {
      return { success: false, error: validation.reason };
    }

    const player = this.room.players[playerIndex];

    // Process the action
    this.executeAction(playerIndex, action, amount);

    // Record action in betting state
    this.bettingState.recordAction(playerIndex, action, amount);
    
    // Validate game state consistency after action
    const stateValidation = this.validateGameState(`after processing ${action} for ${playerId}`);
    if (!stateValidation.isValid) {
      console.error(`❌ [GameController] Game state invalid after action:`, stateValidation);
      // Don't throw error, but log for debugging
    }

    // Check if round is complete
    const roundComplete = this.bettingState.isComplete();
    const gameComplete = this.checkGameComplete();

    if (gameComplete) {
      // Start showdown timer for transition to next hand
      if (this.room.stage !== "showdown") {
        this.room.stage = "showdown";
      }
      this.startShowdownTimer();
      
      return { 
        success: true, 
        gameComplete: true,
        roundComplete: true
      };
    }

    if (roundComplete) {
      return {
        success: true,
        roundComplete: true
      };
    }

    // Advance turn
    const turnAdvanced = this.turnOrder.next();
    if (!turnAdvanced) {
      // No more players can act - round should be complete
      return {
        success: true,
        roundComplete: true
      };
    }

    this.updateCurrentPlayer();
    this.startActionTimer();

    const currentPlayerInfo = this.turnOrder.getCurrentPlayer();
    return {
      success: true,
      nextPlayer: currentPlayerInfo?.player,
      roundComplete: false,
      gameComplete: false
    };
  }

  /**
   * Execute the actual action (modify player/room state)
   */
  private executeAction(playerIndex: number, action: RoomActionType, amount?: number): void {
    const player = this.room.players[playerIndex];
    const maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));

    switch (action) {
      case "fold":
        player.hasFolded = true;
        player.hand = [];
        player.isTurn = false;
        break;

      case "check":
        player.isTurn = false;
        break;

      case "call":
        const toCall = maxBet - player.currentBet;
        const callAmount = Math.min(toCall, player.chips);
        player.chips -= callAmount;
        player.currentBet += callAmount;
        this.room.pot += callAmount;
        player.isTurn = false;
        break;

      case "raise":
        if (amount && amount > 0) {
          player.chips -= amount;
          player.currentBet += amount;
          this.room.pot += amount;
          this.room.lastAggressorIndex = playerIndex;
          player.isTurn = false;
        }
        break;
    }

    // Record in action history
    this.room.actionHistory.push({
      playerId: player.id,
      playerIndex,
      action,
      amount: amount || 0,
      timestamp: Date.now(),
      stage: this.room.stage
    });
  }

  /**
   * Update current player based on turn order
   */
  private updateCurrentPlayer(): void {
    const currentPlayerInfo = this.turnOrder.getCurrentPlayer();
    if (currentPlayerInfo) {
      this.room.currentTurnIndex = currentPlayerInfo.playerIndex;
      
      // Clear all turn flags
      this.room.players.forEach(p => p.isTurn = false);
      
      // Set current player's turn
      currentPlayerInfo.player.isTurn = true;
      
      console.log(`🔄 Turn updated to player ${currentPlayerInfo.player.id} (index: ${currentPlayerInfo.playerIndex})`);
    } else {
      console.error(`❌ [GameController] No current player found in turn order! Attempting recovery...`);
      this.recoverFromNoActivePlayer();
    }
  }

  /**
   * Recovery mechanism when no active player is found
   */
  private recoverFromNoActivePlayer(): void {
    console.log(`🚨 [GameController] Starting recovery from no active player state`);
    
    const activePlayers = this.room.players.filter(p => !p.hasFolded && p.chips > 0);
    
    if (activePlayers.length === 0) {
      console.error(`💀 [GameController] CRITICAL: No players left in game`);
      // This should trigger game end, but don't break the system
      this.room.stage = "showdown";
      return;
    }
    
    if (activePlayers.length === 1) {
      console.log(`🏆 [GameController] Only one player left, ending betting round`);
      // Mark betting round as complete and proceed to showdown/payout
      this.room.players.forEach(p => p.isTurn = false);
      return;
    }
    
    // Find next valid player starting from current index
    const currentIndex = this.room.currentTurnIndex;
    let nextIndex = (currentIndex + 1) % this.room.players.length;
    let searchCount = 0;
    
    while (searchCount < this.room.players.length) {
      const candidate = this.room.players[nextIndex];
      if (candidate && !candidate.hasFolded && candidate.chips > 0) {
        console.log(`✅ [GameController] Recovery: Found valid player ${candidate.id} at index ${nextIndex}`);
        
        // Clear all turn flags and set the new current player
        this.room.players.forEach(p => p.isTurn = false);
        candidate.isTurn = true;
        this.room.currentTurnIndex = nextIndex;
        
        // Reinitialize turn order from this point
        try {
          this.turnOrder.reset();
          console.log(`🔧 [GameController] Turn order reinitialized from recovery player`);
        } catch (reinitError) {
          console.error(`❌ [GameController] Failed to reinitialize turn order during recovery:`, reinitError);
        }
        
        return;
      }
      nextIndex = (nextIndex + 1) % this.room.players.length;
      searchCount++;
    }
    
    console.error(`💀 [GameController] CRITICAL: Could not find any valid player during recovery`);
    // Last resort: force complete the betting round
    this.room.players.forEach(p => p.isTurn = false);
  }

  /**
   * Check if game is complete (only one player remaining)
   */
  private checkGameComplete(): boolean {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    return activePlayers.length <= 1;
  }

  /**
   * Progress to next stage (flop, turn, river, showdown)
   */
  public progressStage(): void {
    const stages = ["preflop", "flop", "turn", "river", "showdown"];
    const currentStageIndex = stages.indexOf(this.room.stage);
    
    if (currentStageIndex < 0 || currentStageIndex >= stages.length - 1) {
      console.warn(`⚠️ [${this.room.id}] Cannot progress from stage: ${this.room.stage}`);
      return;
    }

    const nextStage = stages[currentStageIndex + 1];
    console.log(`⏭️ [${this.room.id}] Progressing from ${this.room.stage} to ${nextStage}`);

    // Deal community cards
    this.dealCommunityCards(nextStage);

    // Update stage
    this.room.stage = nextStage as any;

    // Reset betting for new round (except showdown)
    if (nextStage !== "showdown") {
      this.room.players.forEach(p => p.currentBet = 0);
      this.room.actionHistory = [];
      
      // Reset structures for new betting round
      this.turnOrder.reset();
      this.bettingState.reset();
      
      this.updateCurrentPlayer();
      
      // Start action timer for new round
      this.startActionTimer();
    }
  }

  /**
   * Deal community cards for stage
   */
  private dealCommunityCards(stage: string): void {
    if (!this.room.deck.length) {
      console.warn(`⚠️ [${this.room.id}] No cards in deck for ${stage}`);
      return;
    }

    // Burn one card first
    if (this.room.deck.length > 0) {
      this.room.deck.splice(0, 1);
    }

    switch (stage) {
      case "flop":
        if (this.room.deck.length >= 3) {
          const flop = this.room.deck.splice(0, 3);
          this.room.communityCards.push(...flop);
          console.log(`🃏 [${this.room.id}] Dealt flop: 3 cards`);
        }
        break;

      case "turn":
      case "river":
        if (this.room.deck.length >= 1) {
          const card = this.room.deck.splice(0, 1)[0];
          this.room.communityCards.push(card);
          console.log(`🃏 [${this.room.id}] Dealt ${stage}: 1 card`);
        }
        break;
    }
  }

  /**
   * Check if betting round is complete
   */
  public isBettingRoundComplete(): boolean {
    return this.bettingState.isComplete();
  }

  /**
   * Get valid actions for a player
   */
  public getValidActions(playerId: string): RoomActionType[] {
    const playerIndex = this.room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return [];
    }

    return this.actionValidator.getValidActions(playerIndex);
  }

  /**
   * Get current player who should act
   */
  public getCurrentPlayer(): PlayerSession | null {
    const currentPlayerInfo = this.turnOrder.getCurrentPlayer();
    return currentPlayerInfo?.player || null;
  }

  /**
   * Get betting round state
   */
  public getBettingState(): BettingState {
    return this.bettingState.getState();
  }

  /**
   * Get position information
   */
  public getPositionInfo() {
    return this.positions.getDebugInfo();
  }

  /**
   * Get comprehensive debug information
   */
  public getDebugInfo(): object {
    return {
      room: {
        id: this.room.id,
        stage: this.room.stage,
        pot: this.room.pot,
        activePlayers: this.room.players.filter(p => !p.hasFolded).length,
        currentTurnIndex: this.room.currentTurnIndex
      },
      turnOrder: this.turnOrder.getDebugInfo(),
      bettingState: this.bettingState.getDebugInfo(),
      positions: this.positions.getDebugInfo(),
      gameState: this.actionValidator.getGameStateInfo()
    };
  }

  /**
   * Validate structures are consistent
   */
  public validateState(): boolean {
    const validations = [
      this.turnOrder.isValid(),
      this.positions.isValid(),
      this.actionValidator.isGameActive()
    ];

    return validations.every(v => v);
  }

  /**
   * Refresh all structures (call after external state changes)
   */
  public refresh(): void {
    this.positions.refresh();
    this.turnOrder.reset();
    this.bettingState.refresh();
    this.actionValidator.updateBettingState(this.bettingState);
  }

  /**
   * Get action requirements for a player
   */
  public getActionRequirements(playerId: string) {
    const playerIndex = this.room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return null;
    }

    return this.actionValidator.getPlayerActionRequirements(playerIndex);
  }

  /**
   * Check if any player can act
   */
  public canAnyPlayerAct(): boolean {
    return this.actionValidator.canAnyPlayerAct();
  }

  /**
   * Check if we should fast-forward to showdown (all-in scenario)
   */
  public shouldFastForwardToShowdown(): boolean {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    // Need at least 2 active players
    if (activePlayers.length < 2) {
      return false;
    }
    
    // Check if all active players except at most one are all-in
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    
    // If 0 or 1 player has chips, fast forward
    return playersWithChips.length <= 1;
  }

  /**
   * Fast forward through remaining betting rounds to showdown
   */
  public fastForwardToShowdown(): void {
    console.log(`⏩ [${this.room.id}] Fast-forwarding to showdown (all players all-in)`);
    
    // Mark betting as blocked
    this.bettingState.refresh();
    
    // Progress directly to showdown
    while (this.room.stage !== "showdown") {
      this.progressStage();
    }
  }

  /**
   * Start action timer for current player
   */
  private startActionTimer(): void {
    const currentPlayer = this.turnOrder.getCurrentPlayer();
    if (!currentPlayer) {
      return;
    }

    this.timerManager.startActionTimer(currentPlayer.player.id, () => {
      console.log(`⏰ [${this.room.id}] Action timeout for ${currentPlayer.player.id}`);
      
      // Auto-action on timeout
      const maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));
      const betToCall = maxBet - currentPlayer.player.currentBet;
      const action: RoomActionType = betToCall > 0 ? "fold" : "check";
      
      console.log(`🤖 [${this.room.id}] Auto-${action} for timed out player ${currentPlayer.player.id}`);
      
      // Use callback to trigger action through game engine to avoid recursion
      if (this.onActionTimeout) {
        this.onActionTimeout(currentPlayer.player.id, action);
      }
    });
  }

  /**
   * Start showdown timer for transition to next hand
   */
  private startShowdownTimer(): void {
    this.timerManager.startShowdownTimer(() => {
      console.log(`⏰ [${this.room.id}] Showdown timer complete - starting new hand`);
      
      // Callback to start new hand will be handled by the game engine
      // Just emit event here for the engine to handle
      if (this.onShowdownComplete) {
        this.onShowdownComplete();
      }
    });
  }

  /**
   * Check if enough players to start game and start countdown if needed
   */
  public checkGameStart(): void {
    const activePlayers = this.room.players.filter(p => p.chips > 0);
    
    if (activePlayers.length >= 2 && this.room.stage === "waiting") {
      if (!this.timerManager.isGameStartActive()) {
        console.log(`🎮 [${this.room.id}] Starting game countdown - ${activePlayers.length} players ready`);
        
        this.timerManager.startGameCountdown(() => {
          console.log(`🚀 [${this.room.id}] Game starting automatically`);
          
          // Start new hand
          this.startNewHand();
          
          // Start action timer for first player
          this.startActionTimer();
          
          // Notify game engine
          if (this.onGameAutoStart) {
            this.onGameAutoStart();
          }
        });
      }
    } else if (activePlayers.length < 2 && this.timerManager.isGameStartActive()) {
      console.log(`❌ [${this.room.id}] Cancelling game countdown - not enough players`);
      this.timerManager.cancelGameStart();
    }
  }

  /**
   * Set callback handlers for timer events
   */
  public setTimerCallbacks(callbacks: {
    onGameAutoStart?: () => void;
    onShowdownComplete?: () => void;
    onActionTimeout?: (playerId: string, action: RoomActionType) => void;
  }): void {
    this.onGameAutoStart = callbacks.onGameAutoStart;
    this.onShowdownComplete = callbacks.onShowdownComplete;
    this.onActionTimeout = callbacks.onActionTimeout;
  }

  /**
   * Get timer manager for event subscriptions
   */
  public getTimerManager(): TimerManager {
    return this.timerManager;
  }

  /**
   * Clean up timers when controller is destroyed
   */
  public destroy(): void {
    this.timerManager.clearAllTimers();
  }

  /**
   * Validate game state consistency
   */
  private validateGameState(context: string): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    // Check that we have active players
    const activePlayers = this.room.players.filter(p => !p.hasFolded && p.chips > 0);
    if (activePlayers.length === 0) {
      errors.push("No active players remaining");
    }
    
    // Check that current turn index is valid
    if (this.room.currentTurnIndex < 0 || this.room.currentTurnIndex >= this.room.players.length) {
      errors.push(`Invalid current turn index: ${this.room.currentTurnIndex} (total players: ${this.room.players.length})`);
    }
    
    // Check that exactly one player has isTurn = true (or none if betting round complete)
    const playersWithTurn = this.room.players.filter(p => p.isTurn);
    if (!this.bettingState.isComplete() && playersWithTurn.length !== 1) {
      errors.push(`Expected 1 player with isTurn=true, found ${playersWithTurn.length}: ${playersWithTurn.map(p => p.id).join(', ')}`);
    }
    
    // Check that current player is not folded and has chips
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    if (currentPlayer && !this.bettingState.isComplete()) {
      if (currentPlayer.hasFolded) {
        errors.push(`Current player ${currentPlayer.id} has folded but is still current`);
      }
      if (currentPlayer.chips <= 0 && !currentPlayer.hasFolded) {
        errors.push(`Current player ${currentPlayer.id} has no chips but hasn't folded`);
      }
    }
    
    // Check betting state consistency
    if (activePlayers.length > 1) {
      const maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));
      const playersNeedingAction = activePlayers.filter(p => 
        p.currentBet < maxBet && p.chips > 0 && !p.hasFolded
      );
      
      if (this.bettingState.isComplete() && playersNeedingAction.length > 0) {
        errors.push(`Betting marked complete but ${playersNeedingAction.length} players still need to act`);
      }
    }
    
    if (errors.length > 0) {
      console.log(`🔍 [GameController] State validation failed (${context}):`, {
        errors,
        gameState: {
          currentTurnIndex: this.room.currentTurnIndex,
          currentPlayer: currentPlayer?.id,
          stage: this.room.stage,
          activePlayers: activePlayers.map(p => ({ id: p.id, chips: p.chips, currentBet: p.currentBet, isTurn: p.isTurn })),
          bettingComplete: this.bettingState.isComplete()
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Callback handlers
  private onGameAutoStart?: () => void;
  private onShowdownComplete?: () => void;
  private onActionTimeout?: (playerId: string, action: RoomActionType) => void;
}