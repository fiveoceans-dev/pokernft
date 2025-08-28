import { GameRoom, PlayerSession, Stage, RoomActionType } from "../core/types";

/**
 * Betting round states
 */
export enum BettingState {
  OPENING = "opening",        // Round just started, blinds posted
  BETTING = "betting",        // Active betting in progress  
  AWAITING_ACTION = "awaiting_action", // Waiting for specific player action
  COMPLETE = "complete",      // Betting round finished
  BLOCKED = "blocked"         // No more betting allowed (showdown/all-in)
}

/**
 * Player action requirement types
 */
export enum ActionRequirement {
  NONE = "none",
  BB_OPTION = "bb_option",           // BB needs option in unopened pot
  MATCH_RAISE = "match_raise",       // Players need to match a raise  
  COMPLETE_ROUND = "complete_round"  // Round needs to complete normally
}

/**
 * Betting round completion reason
 */
export enum CompletionReason {
  ALL_MATCHED = "all_matched",               // All players matched bets
  BB_EXERCISED_OPTION = "bb_exercised_option", // BB exercised their option
  ACTION_RETURNED = "action_returned",       // Action returned to raiser/first actor
  ALL_IN_SCENARIO = "all_in_scenario",       // All-in, no more betting possible
  SINGLE_PLAYER = "single_player"            // Only one player remains
}

/**
 * State machine for managing betting rounds
 * Handles betting progression, completion detection, and action requirements
 */
export class BettingRoundState {
  private state: BettingState = BettingState.OPENING;
  private requirement: ActionRequirement = ActionRequirement.NONE;
  private room: GameRoom;
  private maxBet: number = 0;
  private lastAggressorIndex: number = -1;
  private firstToActIndex: number = -1;
  private playersWhoNeedToAct: Set<number> = new Set();

  constructor(room: GameRoom) {
    this.room = room;
    this.initialize();
  }

  /**
   * Initialize betting round state
   */
  private initialize(): void {
    this.state = BettingState.OPENING;
    this.requirement = ActionRequirement.NONE;
    this.maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));
    this.lastAggressorIndex = this.room.lastAggressorIndex;
    this.firstToActIndex = this.room.firstToActIndex;
    
    this.calculatePlayersWhoNeedToAct();
    this.determineRequirement();
    this.updateState();

  }

  /**
   * Calculate which players still need to act
   */
  private calculatePlayersWhoNeedToAct(): void {
    this.playersWhoNeedToAct.clear();
    
    const activePlayers = this.room.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => !player.hasFolded && player.chips > 0);

    // All players with chips who haven't matched the max bet need to act
    for (const { player, index } of activePlayers) {
      if (player.currentBet < this.maxBet) {
        this.playersWhoNeedToAct.add(index);
      }
    }

    // Special case: BB option in unopened preflop pot
    if (this.room.stage === "preflop" && this.maxBet === this.room.bigBlindAmount) {
      const bbIndex = this.getBigBlindIndex();
      const bbPlayer = this.room.players[bbIndex];
      
      if (bbPlayer && !bbPlayer.hasFolded && bbPlayer.chips > 0) {
        const bbHasActed = this.hasPlayerActedVoluntarily(bbIndex);
        if (!bbHasActed) {
          this.playersWhoNeedToAct.add(bbIndex);
        }
      }
    }
  }

  /**
   * Determine what type of action is required
   */
  private determineRequirement(): void {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    // Single player remaining
    if (activePlayers.length <= 1) {
      console.log(`🔍 [BettingRoundState] Single player remaining - setting requirement to NONE`);
      this.requirement = ActionRequirement.NONE;
      return;
    }

    // All players are all-in
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    if (playersWithChips.length <= 1) {
      console.log(`🔍 [BettingRoundState] All players all-in - setting requirement to NONE`);
      this.requirement = ActionRequirement.NONE;
      return;
    }

    // Preflop unopened pot - BB needs option
    if (this.room.stage === "preflop" && this.maxBet === this.room.bigBlindAmount) {
      const bbIndex = this.getBigBlindIndex();
      const bbPlayer = this.room.players[bbIndex];
      
      if (bbPlayer && !bbPlayer.hasFolded && bbPlayer.chips > 0) {
        const bbHasActed = this.hasPlayerActedVoluntarily(bbIndex);
        console.log(`🔍 [BettingRoundState] BB option check: bbIndex=${bbIndex}, bbHasActed=${bbHasActed}, maxBet=${this.maxBet}, bbAmount=${this.room.bigBlindAmount}`);
        if (!bbHasActed) {
          console.log(`🔍 [BettingRoundState] BB needs option - setting requirement to BB_OPTION`);
          this.requirement = ActionRequirement.BB_OPTION;
          return;
        }
      }
    }

    // Players need to match a raise
    if (this.playersWhoNeedToAct.size > 0) {
      console.log(`🔍 [BettingRoundState] ${this.playersWhoNeedToAct.size} players need to act - setting requirement to MATCH_RAISE`);
      this.requirement = ActionRequirement.MATCH_RAISE;
      return;
    }

    // Normal round completion
    console.log(`🔍 [BettingRoundState] Normal completion - setting requirement to COMPLETE_ROUND`);
    this.requirement = ActionRequirement.COMPLETE_ROUND;
  }

  /**
   * Update betting state based on current conditions
   */
  private updateState(): void {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    // Check for blocked states first
    if (activePlayers.length <= 1) {
      this.state = BettingState.BLOCKED;
      return;
    }

    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    if (playersWithChips.length <= 1) {
      this.state = BettingState.BLOCKED;
      return;
    }

    if (this.room.stage === "showdown") {
      this.state = BettingState.BLOCKED;
      return;
    }

    // Determine active states
    switch (this.requirement) {
      case ActionRequirement.NONE:
        console.log(`🔍 [BettingRoundState] Requirement NONE - setting state to COMPLETE`);
        this.state = BettingState.COMPLETE;
        break;
        
      case ActionRequirement.BB_OPTION:
        console.log(`🔍 [BettingRoundState] Requirement BB_OPTION - setting state to AWAITING_ACTION`);
        this.state = BettingState.AWAITING_ACTION;
        break;
        
      case ActionRequirement.MATCH_RAISE:
        console.log(`🔍 [BettingRoundState] Requirement MATCH_RAISE - setting state to BETTING`);
        this.state = BettingState.BETTING;
        break;
        
      case ActionRequirement.COMPLETE_ROUND:
        const hasReturned = this.hasActionReturned();
        console.log(`🔍 [BettingRoundState] Requirement COMPLETE_ROUND - hasActionReturned=${hasReturned}`);
        if (hasReturned) {
          console.log(`🔍 [BettingRoundState] Action returned - setting state to COMPLETE`);
          this.state = BettingState.COMPLETE;
        } else {
          console.log(`🔍 [BettingRoundState] Action not returned - setting state to BETTING`);
          this.state = BettingState.BETTING;
        }
        break;
    }
  }

  /**
   * Record a player action and update state
   */
  public recordAction(playerIndex: number, action: RoomActionType, amount?: number): void {
    const player = this.room.players[playerIndex];
    if (!player) {
      console.error(`❌ [${this.room.id}] Invalid player index for action: ${playerIndex}`);
      return;
    }


    // Update max bet if this is a raise
    if (action === "raise" && amount) {
      this.maxBet = player.currentBet;
      this.lastAggressorIndex = playerIndex;
    }

    // Remove player from need-to-act set
    this.playersWhoNeedToAct.delete(playerIndex);

    // If player raises, other players may need to act again
    if (action === "raise") {
      this.calculatePlayersWhoNeedToAct();
    }

    // Recalculate requirements and state
    this.determineRequirement();
    this.updateState();
  }

  /**
   * Check if a player can legally act
   */
  public canPlayerAct(playerIndex: number): boolean {
    const player = this.room.players[playerIndex];
    if (!player || player.hasFolded || player.chips === 0) {
      return false;
    }

    // Can't act if betting is blocked
    if (this.state === BettingState.BLOCKED || this.state === BettingState.COMPLETE) {
      return false;
    }

    // Can always act if it's your turn and betting is active
    if (this.room.currentTurnIndex === playerIndex && 
        (this.state === BettingState.BETTING || this.state === BettingState.AWAITING_ACTION)) {
      return true;
    }

    return false;
  }

  /**
   * Check if betting round is complete
   */
  public isComplete(): boolean {
    return this.state === BettingState.COMPLETE || this.state === BettingState.BLOCKED;
  }

  /**
   * Get completion reason
   */
  public getCompletionReason(): CompletionReason {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    if (activePlayers.length <= 1) {
      return CompletionReason.SINGLE_PLAYER;
    }

    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    if (playersWithChips.length <= 1) {
      return CompletionReason.ALL_IN_SCENARIO;
    }

    if (this.requirement === ActionRequirement.BB_OPTION && this.state === BettingState.COMPLETE) {
      return CompletionReason.BB_EXERCISED_OPTION;
    }

    if (this.hasActionReturned()) {
      return CompletionReason.ACTION_RETURNED;
    }

    return CompletionReason.ALL_MATCHED;
  }

  /**
   * Check if action has returned to the appropriate player
   */
  private hasActionReturned(): boolean {
    // If there was a raise, action must return to the raiser
    if (this.lastAggressorIndex >= 0) {
      const lastRaiser = this.room.players[this.lastAggressorIndex];
      if (lastRaiser && !lastRaiser.hasFolded && lastRaiser.chips > 0) {
        return this.room.currentTurnIndex === this.lastAggressorIndex;
      }
    }

    // No raises - action returns to first to act  
    if (this.firstToActIndex >= 0) {
      const firstPlayer = this.room.players[this.firstToActIndex];
      if (firstPlayer && !firstPlayer.hasFolded && firstPlayer.chips > 0) {
        return this.room.currentTurnIndex === this.firstToActIndex;
      }
    }

    return false;
  }

  /**
   * Check if player has made a voluntary action (not blind)
   */
  private hasPlayerActedVoluntarily(playerIndex: number): boolean {
    return this.room.actionHistory.some(entry => 
      entry.playerIndex === playerIndex && entry.action !== "blind"
    );
  }

  /**
   * Get big blind player index
   */
  private getBigBlindIndex(): number {
    if (this.room.players.length === 2) {
      // Heads-up: non-dealer is big blind
      return this.room.dealerIndex === 0 ? 1 : 0;
    }
    
    // Multi-way: big blind is two positions clockwise from dealer
    return (this.room.dealerIndex + 2) % this.room.players.length;
  }

  /**
   * Get current betting state
   */
  public getState(): BettingState {
    return this.state;
  }

  /**
   * Get current action requirement
   */
  public getRequirement(): ActionRequirement {
    return this.requirement;
  }

  /**
   * Get players who still need to act
   */
  public getPlayersWhoNeedToAct(): number[] {
    return Array.from(this.playersWhoNeedToAct);
  }

  /**
   * Force state recalculation (useful after external changes)
   */
  public refresh(): void {
    this.maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));
    this.calculatePlayersWhoNeedToAct();
    this.determineRequirement();
    this.updateState();
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): object {
    return {
      state: this.state,
      requirement: this.requirement,
      maxBet: this.maxBet,
      lastAggressorIndex: this.lastAggressorIndex,
      firstToActIndex: this.firstToActIndex,
      playersWhoNeedToAct: Array.from(this.playersWhoNeedToAct),
      completionReason: this.isComplete() ? this.getCompletionReason() : null
    };
  }

  /**
   * Reset for new betting round
   */
  public reset(): void {
    this.initialize();
  }

  /**
   * Check if Big Blind needs their option specifically
   */
  public requiresBBOption(): boolean {
    return this.requirement === ActionRequirement.BB_OPTION;
  }

  /**
   * Check if betting is currently active (players can make actions)
   */
  public isActive(): boolean {
    return this.state === BettingState.BETTING || this.state === BettingState.AWAITING_ACTION;
  }

  /**
   * Check if betting is blocked (no more actions allowed)
   */
  public isBlocked(): boolean {
    return this.state === BettingState.BLOCKED;
  }
}