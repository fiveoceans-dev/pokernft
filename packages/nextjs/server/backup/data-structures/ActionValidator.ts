import { GameRoom, PlayerSession, Stage, RoomActionType } from "../core/types";
import { BettingRoundState, BettingState } from "./BettingRoundState";

/**
 * Action validation result
 */
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  validActions?: RoomActionType[];
  normalizedAmount?: number;
  isAllIn?: boolean;
}

/**
 * Action requirements for validation
 */
interface ActionRequirements {
  minRaise: number;
  maxRaise: number;
  betToCall: number;
  canCheck: boolean;
  canFold: boolean;
  canCall: boolean;
  canRaise: boolean;
}

/**
 * Validates player actions based on game state, betting rules, and player status
 * Prevents invalid actions and provides detailed validation feedback
 */
export class ActionValidator {
  private room: GameRoom;
  private bettingState: BettingRoundState;

  constructor(room: GameRoom, bettingState: BettingRoundState) {
    this.room = room;
    this.bettingState = bettingState;
  }

  /**
   * Check if a player can legally act right now
   */
  public canPlayerAct(playerIndex: number): ValidationResult {
    const player = this.room.players[playerIndex];
    
    if (!player) {
      return { isValid: false, reason: "Player not found" };
    }

    // Basic player state checks
    if (player.hasFolded) {
      return { isValid: false, reason: "Player has folded" };
    }

    if (player.chips === 0) {
      return { isValid: false, reason: "Player is all-in" };
    }

    // Game state checks
    if (this.room.stage === "waiting") {
      return { isValid: false, reason: "Game not in progress" };
    }

    if (this.room.stage === "showdown") {
      return { isValid: false, reason: "Game is at showdown" };
    }

    // Betting round checks
    if (this.bettingState.isBlocked()) {
      return { isValid: false, reason: "Betting is blocked" };
    }

    if (this.bettingState.isComplete()) {
      return { isValid: false, reason: "Betting round is complete" };
    }

    // Turn checks
    if (this.room.currentTurnIndex !== playerIndex) {
      return { isValid: false, reason: "Not player's turn" };
    }

    if (!player.isTurn) {
      return { isValid: false, reason: "Player turn flag not set" };
    }

    // If we get here, player can act
    return { 
      isValid: true
    };
  }

  /**
   * Validate a specific action
   */
  public validateAction(
    playerIndex: number, 
    action: RoomActionType, 
    amount?: number
  ): ValidationResult {
    
    // First check if player can act at all
    const canActResult = this.canPlayerAct(playerIndex);
    if (!canActResult.isValid) {
      return canActResult;
    }

    const player = this.room.players[playerIndex];
    const requirements = this.getActionRequirements(playerIndex);

    // Validate specific action
    switch (action) {
      case "fold":
        return this.validateFold(player, requirements);
        
      case "check":
        return this.validateCheck(player, requirements);
        
      case "call":
        return this.validateCall(player, requirements);
        
      case "raise":
        return this.validateRaise(player, requirements, amount);
        
      default:
        return { isValid: false, reason: `Unknown action: ${action}` };
    }
  }

  /**
   * Get valid actions for a player
   */
  public getValidActions(playerIndex: number): RoomActionType[] {
    const canActResult = this.canPlayerAct(playerIndex);
    if (!canActResult.isValid) {
      return [];
    }

    const requirements = this.getActionRequirements(playerIndex);
    const validActions: RoomActionType[] = [];

    if (requirements.canFold) {
      validActions.push("fold");
    }

    if (requirements.canCheck) {
      validActions.push("check");
    }

    if (requirements.canCall) {
      validActions.push("call");
    }

    if (requirements.canRaise) {
      validActions.push("raise");
    }

    return validActions;
  }

  /**
   * Get action requirements for a player
   */
  private getActionRequirements(playerIndex: number): ActionRequirements {
    const player = this.room.players[playerIndex];
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    const maxBet = Math.max(0, ...activePlayers.map(p => p.currentBet));
    const betToCall = Math.max(0, maxBet - player.currentBet);

    // Calculate minimum raise
    const minRaise = Math.max(this.room.minBet, this.room.bigBlindAmount);
    const lastRaiseAmount = this.getLastRaiseAmount();
    const minRaiseAmount = Math.max(minRaise, lastRaiseAmount);

    // Check if this is BB with option (preflop, unopened pot)
    const isBBOption = this.isBBWithOption(playerIndex);

    // Player can check if they don't owe money
    const canCheck = betToCall === 0;
    
    // Player can call if they owe money and have any chips
    const canCall = betToCall > 0 && player.chips > 0;
    
    // Player can raise if they have enough chips for min raise
    // Special case: BB with option can raise with just minRaiseAmount (no need to call first)
    const totalRaiseAmount = isBBOption ? minRaiseAmount : (betToCall + minRaiseAmount);
    const canRaise = player.chips >= totalRaiseAmount && this.canRaiseInCurrentSituation();

    // Player can always fold (unless already all-in)
    const canFold = player.chips > 0;

    return {
      minRaise: minRaiseAmount,
      maxRaise: Math.max(0, player.chips - betToCall), // All remaining chips after calling
      betToCall,
      canCheck,
      canFold,
      canCall,
      canRaise
    };
  }

  /**
   * Validate fold action
   */
  private validateFold(player: PlayerSession, requirements: ActionRequirements): ValidationResult {
    if (!requirements.canFold) {
      return { isValid: false, reason: "Cannot fold" };
    }

    return { isValid: true };
  }

  /**
   * Validate check action
   */
  private validateCheck(player: PlayerSession, requirements: ActionRequirements): ValidationResult {
    if (!requirements.canCheck) {
      return { 
        isValid: false, 
        reason: `Cannot check - must call $${requirements.betToCall}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate call action
   */
  private validateCall(player: PlayerSession, requirements: ActionRequirements): ValidationResult {
    if (requirements.betToCall === 0) {
      return { isValid: false, reason: "Cannot call - no bet to call (use check instead)" };
    }

    const callAmount = Math.min(requirements.betToCall, player.chips);
    const isAllIn = player.chips <= requirements.betToCall;

    return { isValid: true, normalizedAmount: callAmount, isAllIn };
  }

  /**
   * Validate raise action
   */
  private validateRaise(
    player: PlayerSession, 
    requirements: ActionRequirements, 
    amount?: number
  ): ValidationResult {
    
    if (!requirements.canRaise) {
      return { isValid: false, reason: "Cannot raise in current situation" };
    }

    if (amount === undefined || amount <= 0) {
      return { 
        isValid: false, 
        reason: `Raise amount required (min: $${requirements.minRaise})` 
      };
    }

    // For BB option, the amount is the raise itself (no call needed)
    // For normal raises, amount is on top of the call amount
    const playerIndex = this.room.players.findIndex(p => p.id === player.id);
    const isBBOption = this.isBBWithOption(playerIndex);
    
    const totalAmount = isBBOption ? amount : (requirements.betToCall + amount);

    if (totalAmount > player.chips) {
      return { 
        isValid: false, 
        reason: `Not enough chips - need $${totalAmount}, have $${player.chips}` 
      };
    }

    if (amount < requirements.minRaise) {
      return { 
        isValid: false, 
        reason: `Raise too small - minimum raise is $${requirements.minRaise}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Check if raising is allowed in current situation
   */
  private canRaiseInCurrentSituation(): boolean {
    // Can't raise if betting is complete or blocked
    if (this.bettingState.isComplete() || this.bettingState.isBlocked()) {
      return false;
    }

    // Need at least 2 players with chips to raise
    const playersWithChips = this.room.players.filter(p => !p.hasFolded && p.chips > 0);
    if (playersWithChips.length < 2) {
      return false;
    }

    // Check for betting cap rules (if implemented)
    // For now, allow raises

    return true;
  }

  /**
   * Get the last raise amount to determine minimum raise
   */
  private getLastRaiseAmount(): number {
    // Look through action history for the most recent raise
    const raiseActions = this.room.actionHistory
      .filter(action => action.action === "raise")
      .reverse(); // Most recent first

    if (raiseActions.length === 0) {
      return this.room.bigBlindAmount; // Default to big blind
    }

    // Return the most recent raise amount
    return raiseActions[0].amount || this.room.bigBlindAmount;
  }

  /**
   * Check if game is in a valid state for any actions
   */
  public isGameActive(): boolean {
    // Game must be in active stage
    const activeStages: Stage[] = ["preflop", "flop", "turn", "river"];
    if (!activeStages.includes(this.room.stage)) {
      return false;
    }

    // Need at least 2 active players
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    if (activePlayers.length < 2) {
      return false;
    }

    // Betting must be active
    if (this.bettingState.isBlocked()) {
      return false;
    }

    return true;
  }

  /**
   * Get detailed game state for debugging
   */
  public getGameStateInfo(): object {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const maxBet = Math.max(0, ...activePlayers.map(p => p.currentBet));
    
    return {
      stage: this.room.stage,
      activePlayers: activePlayers.length,
      playersWithChips: playersWithChips.length,
      maxBet,
      currentTurnIndex: this.room.currentTurnIndex,
      bettingState: this.bettingState.getState(),
      bettingRequirement: this.bettingState.getRequirement(),
      isGameActive: this.isGameActive()
    };
  }

  /**
   * Get action requirements for a specific player (public method)
   */
  public getPlayerActionRequirements(playerIndex: number): ActionRequirements | null {
    const canActResult = this.canPlayerAct(playerIndex);
    if (!canActResult.isValid) {
      return null;
    }

    return this.getActionRequirements(playerIndex);
  }

  /**
   * Validate action and return detailed feedback
   */
  public validateActionDetailed(
    playerIndex: number,
    action: RoomActionType,
    amount?: number
  ): {
    isValid: boolean;
    reason?: string;
    requirements?: ActionRequirements;
    gameState?: object;
  } {
    
    const validation = this.validateAction(playerIndex, action, amount);
    const requirements = this.getActionRequirements(playerIndex);
    const gameState = this.getGameStateInfo();

    return {
      ...validation,
      requirements,
      gameState
    };
  }

  /**
   * Check if any player can act (useful for determining if round should advance)
   */
  public canAnyPlayerAct(): boolean {
    for (let i = 0; i < this.room.players.length; i++) {
      const result = this.canPlayerAct(i);
      if (result.isValid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Update internal references (call when betting state changes)
   */
  public updateBettingState(bettingState: BettingRoundState): void {
    this.bettingState = bettingState;
  }

  /**
   * Check if player is BB with option in unopened pot
   */
  private isBBWithOption(playerIndex: number): boolean {
    // Must be preflop
    if (this.room.stage !== "preflop") {
      return false;
    }

    // Check if pot is unopened (max bet is still big blind)
    const maxBet = Math.max(0, ...this.room.players.map(p => p.currentBet));
    if (maxBet !== this.room.bigBlindAmount) {
      return false;
    }

    // Check if this player is the BB
    const bbIndex = this.getBigBlindIndex();
    if (playerIndex !== bbIndex) {
      return false;
    }

    // Check if BB hasn't acted voluntarily yet
    const bbHasActed = this.room.actionHistory.some(entry => 
      entry.playerIndex === playerIndex && entry.action !== "blind"
    );
    
    return !bbHasActed;
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
}