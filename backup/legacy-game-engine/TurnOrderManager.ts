import { GameRoom, PlayerSession, Stage } from "./types";

/**
 * Manages turn order logic for different poker scenarios
 * Handles preflop, post-flop, heads-up, and multi-way turn sequencing
 */
export class TurnOrderManager {
  
  /**
   * Advances to the next player's turn - simple clockwise order for all stages
   */
  static advanceToNextPlayer(room: GameRoom): void {
    const currentIndex = room.currentTurnIndex;
    const nextIndex = this.getNextActivePlayerIndex(room, currentIndex);
    
    // Clear current player's turn flag
    if (currentIndex >= 0 && room.players[currentIndex]) {
      room.players[currentIndex].isTurn = false;
    }
    
    // Set next player's turn
    if (nextIndex >= 0 && room.players[nextIndex]) {
      room.currentTurnIndex = nextIndex;
      room.players[nextIndex].isTurn = true;
      console.log(`👉 [${room.id}] Turn advanced from ${currentIndex} to ${nextIndex}`);
    } else {
      // No valid next player
      room.currentTurnIndex = -1;
      console.log(`⚠️ [${room.id}] No valid next player found`);
    }
  }
  
  /**
   * Gets the index of the next player who can act
   */
  static getNextActivePlayerIndex(room: GameRoom, fromIndex: number): number {
    const playerCount = room.players.length;
    
    for (let i = 1; i <= playerCount; i++) {
      const nextIndex = (fromIndex + i) % playerCount;
      const player = room.players[nextIndex];
      
      if (this.canPlayerAct(player)) {
        return nextIndex;
      }
    }
    
    return -1; // No valid next player
  }
  
  /**
   * Gets the next player in preflop - simplified to use normal clockwise order
   * Betting completion logic will handle BB's special requirements
   */
  static getNextPreflopPlayerIndex(room: GameRoom, fromIndex: number): number {
    // Use the same logic as postflop - simple clockwise advancement
    return this.getNextActivePlayerIndex(room, fromIndex);
  }
  
  /**
   * Determines if a player can act (not folded, has chips or can check)
   */
  static canPlayerAct(player: PlayerSession | null): boolean {
    if (!player || player.hasFolded) {
      return false;
    }
    
    // Player can act if they have chips or can check/fold
    return player.chips > 0 || true; // Can always at least fold/check
  }
  
  /**
   * Initializes turn order for the start of a new betting round
   */
  static initializeTurnOrder(room: GameRoom): void {
    const stage = room.stage;
    const isHeadsUp = room.players.filter(p => !p.hasFolded).length === 2;
    
    console.log(`🎯 [${room.id}] Initializing turn order for ${stage}, heads-up: ${isHeadsUp}`);
    
    if (stage === "preflop") {
      this.initializePreflopTurnOrder(room, isHeadsUp);
    } else {
      this.initializePostflopTurnOrder(room, isHeadsUp);
    }
  }
  
  /**
   * Sets up preflop turn order - BB always acts LAST
   */
  private static initializePreflopTurnOrder(room: GameRoom, isHeadsUp: boolean): void {
    if (isHeadsUp) {
      // Heads-up preflop: SB (button) acts first, BB acts last
      const sbIndex = this.getSmallBlindIndex(room);
      this.setFirstToAct(room, sbIndex);
      console.log(`🎲 [${room.id}] Heads-up preflop: SB ${sbIndex} acts first, BB will act last`);
    } else {
      // Multi-way preflop: UTG acts first, but BB will act last
      const bbIndex = this.getBigBlindIndex(room);
      const utg = this.getNextActivePlayerIndex(room, bbIndex); // UTG (left of BB)
      this.setFirstToAct(room, utg);
      console.log(`🎲 [${room.id}] Multi-way preflop: UTG ${utg} acts first, BB ${bbIndex} will act last`);
    }
  }
  
  /**
   * Sets up post-flop turn order
   */
  private static initializePostflopTurnOrder(room: GameRoom, isHeadsUp: boolean): void {
    if (isHeadsUp) {
      // Heads-up post-flop: non-button (big blind) acts first
      const buttonIndex = room.dealerIndex;
      const nonButtonIndex = buttonIndex === 0 ? 1 : 0;
      this.setFirstToAct(room, nonButtonIndex);
      console.log(`🎲 [${room.id}] Heads-up post-flop: non-button ${nonButtonIndex} acts first`);
    } else {
      // Multi-way post-flop: first active player left of button acts first
      const firstToActIndex = this.getNextActivePlayerIndex(room, room.dealerIndex);
      this.setFirstToAct(room, firstToActIndex);
      console.log(`🎲 [${room.id}] Multi-way post-flop: ${firstToActIndex} acts first`);
    }
  }
  
  /**
   * Sets the first to act player and current turn
   */
  private static setFirstToAct(room: GameRoom, playerIndex: number): void {
    // Clear all turn flags
    room.players.forEach(player => {
      player.isTurn = false;
    });
    
    if (playerIndex >= 0 && room.players[playerIndex]) {
      room.firstToActIndex = playerIndex;
      room.currentTurnIndex = playerIndex;
      room.players[playerIndex].isTurn = true;
    } else {
      room.firstToActIndex = -1;
      room.currentTurnIndex = -1;
    }
  }
  
  /**
   * Gets the big blind player index
   */
  private static getBigBlindIndex(room: GameRoom): number {
    const activePlayerCount = room.players.filter(p => !p.hasFolded).length;
    
    if (activePlayerCount === 2) {
      // Heads-up: non-dealer is big blind
      return room.dealerIndex === 0 ? 1 : 0;
    }
    
    // Multi-way: big blind is two positions clockwise from dealer
    return (room.dealerIndex + 2) % room.players.length;
  }
  
  /**
   * Gets the small blind player index
   */
  static getSmallBlindIndex(room: GameRoom): number {
    const activePlayerCount = room.players.filter(p => !p.hasFolded).length;
    
    if (activePlayerCount === 2) {
      // Heads-up: dealer is small blind
      return room.dealerIndex;
    }
    
    // Multi-way: small blind is one position clockwise from dealer
    return (room.dealerIndex + 1) % room.players.length;
  }
  
  /**
   * Checks if action has returned to the appropriate player for round completion
   */
  static hasActionReturned(room: GameRoom): boolean {
    const currentPlayer = room.currentTurnIndex;
    
    // Check if action returned to last raiser
    if (room.lastAggressorIndex >= 0) {
      const actionBackToRaiser = currentPlayer === room.lastAggressorIndex;
      if (actionBackToRaiser) {
        console.log(`✅ [${room.id}] Action returned to last raiser ${room.lastAggressorIndex}`);
        return true;
      }
    }
    
    // Check if action returned to first to act (no raises occurred)
    const actionBackToFirst = currentPlayer === room.firstToActIndex;
    if (actionBackToFirst) {
      console.log(`✅ [${room.id}] Action returned to first to act ${room.firstToActIndex}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Validates that the current turn order state is consistent
   */
  static validateTurnOrder(room: GameRoom): boolean {
    // Check that exactly one player has isTurn = true
    const playersWithTurn = room.players.filter(p => p.isTurn);
    
    if (playersWithTurn.length > 1) {
      console.error(`❌ [${room.id}] Multiple players have turn: ${playersWithTurn.map(p => p.id).join(', ')}`);
      return false;
    }
    
    // Check that currentTurnIndex matches the player with isTurn
    if (playersWithTurn.length === 1) {
      const turnPlayerIndex = room.players.indexOf(playersWithTurn[0]);
      if (turnPlayerIndex !== room.currentTurnIndex) {
        console.error(`❌ [${room.id}] Turn index mismatch: currentTurnIndex=${room.currentTurnIndex}, actual=${turnPlayerIndex}`);
        return false;
      }
    }
    
    return true;
  }
}