import { GameRoom, PlayerSession, Stage } from "./types";

/**
 * Centralized betting rule engine for proper poker betting logic
 * Handles preflop BB last action, turn order, and betting completion detection
 */
export class BettingRuleEngine {
  
  /**
   * Determines if the current betting round is complete
   * Handles special cases like preflop BB last action
   */
  static isBettingRoundComplete(room: GameRoom): boolean {
    const activePlayers = room.players.filter(p => !p.hasFolded);
    
    // Round complete if only one or zero players remain
    if (activePlayers.length <= 1) {
      console.log(`✅ [${room.id}] Betting complete: only ${activePlayers.length} active players`);
      return true;
    }
    
    // Round complete if all active players are all-in
    const allInPlayers = activePlayers.filter(p => p.chips === 0);
    if (allInPlayers.length === activePlayers.length) {
      console.log(`✅ [${room.id}] Betting complete: all active players are all-in`);
      return true;
    }
    
    // Check if all active players have matched the highest bet
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allMatched = playersWithChips.every(p => p.currentBet === maxBet);
    
    if (!allMatched) {
      console.log(`⏳ [${room.id}] Betting incomplete: not all bets matched (max: ${maxBet})`);
      return false;
    }
    
    // Special preflop rule: BB has last action if pot is unopened
    if (room.stage === "preflop") {
      return this.isPreflopComplete(room, activePlayers, maxBet);
    }
    
    // Post-flop: betting complete when action returns to last raiser or first to act
    return this.isPostflopComplete(room, activePlayers);
  }
  
  /**
   * Handles preflop betting completion with BB last action rule
   */
  private static isPreflopComplete(room: GameRoom, activePlayers: PlayerSession[], maxBet: number): boolean {
    const bbIndex = this.findBigBlindIndex(room);
    const bbPlayer = room.players[bbIndex];
    
    if (!bbPlayer || bbPlayer.hasFolded) {
      console.log(`✅ [${room.id}] Preflop complete: BB not in hand`);
      return true;
    }
    
    // If pot is unopened (no raises beyond BB), BB needs final action
    const isUnopened = maxBet === room.bigBlindAmount;
    
    if (isUnopened) {
      // Check if BB needs their final action
      const bbNeedsAction = this.bbNeedsFinalAction(room, bbIndex);
      if (bbNeedsAction) {
        console.log(`⏳ [${room.id}] Unopened preflop pot - BB needs final action`);
        return false;
      }
      
      const bbHasActed = this.hasPlayerActedThisRound(room, bbIndex);
      console.log(`✅ [${room.id}] Unopened preflop pot - BB has acted: ${bbHasActed}`);
      return bbHasActed;
    }
    
    // Pot was raised - normal action completion rules apply
    const lastRaiserIndex = room.lastAggressorIndex;
    if (lastRaiserIndex >= 0) {
      const actionBackToRaiser = room.currentTurnIndex === lastRaiserIndex;
      console.log(`✅ [${room.id}] Raised preflop pot - action back to raiser: ${actionBackToRaiser}`);
      return actionBackToRaiser;
    }
    
    return true;
  }
  
  /**
   * Handles post-flop betting completion
   */
  private static isPostflopComplete(room: GameRoom, activePlayers: PlayerSession[]): boolean {
    // If there was a raise, action must return to the raiser
    if (room.lastAggressorIndex >= 0) {
      const lastRaiser = room.players[room.lastAggressorIndex];
      if (lastRaiser && !lastRaiser.hasFolded && lastRaiser.chips > 0) {
        const actionBackToRaiser = room.currentTurnIndex === room.lastAggressorIndex;
        console.log(`🎯 [${room.id}] Post-flop with raise - action back to raiser: ${actionBackToRaiser}`);
        return actionBackToRaiser;
      }
    }
    
    // No raises - action returns to first to act
    const actionBackToFirst = room.currentTurnIndex === room.firstToActIndex;
    console.log(`✅ [${room.id}] Post-flop no raises - action back to first: ${actionBackToFirst}`);
    return actionBackToFirst;
  }
  
  /**
   * Finds the big blind player index
   */
  private static findBigBlindIndex(room: GameRoom): number {
    // In heads-up, dealer is small blind, other player is big blind
    if (room.players.length === 2) {
      return room.dealerIndex === 0 ? 1 : 0;
    }
    
    // In multi-way, BB is two positions after dealer
    return (room.dealerIndex + 2) % room.players.length;
  }
  
  /**
   * Checks if a player has made a voluntary action this betting round
   * Excludes forced blind postings
   */
  private static hasPlayerActedThisRound(room: GameRoom, playerIndex: number): boolean {
    const player = room.players[playerIndex];
    if (!player) return false;
    
    // Check if player has made any voluntary action (non-blind) in current round
    return room.actionHistory.some(entry => 
      entry.playerIndex === playerIndex && entry.action !== "blind"
    );
  }
  
  /**
   * Checks if Big Blind needs their final action in preflop
   */
  private static bbNeedsFinalAction(room: GameRoom, bbIndex: number): boolean {
    const bbPlayer = room.players[bbIndex];
    if (!bbPlayer || bbPlayer.hasFolded) return false;
    
    // Check if BB has made any voluntary action
    const bbHasActed = this.hasPlayerActedThisRound(room, bbIndex);
    
    // Check if all other active players have acted
    const activePlayers = room.players.filter((p, i) => !p.hasFolded && i !== bbIndex);
    const allOthersActed = activePlayers.every((p, i) => {
      const realIndex = room.players.indexOf(p);
      return this.hasPlayerActedThisRound(room, realIndex);
    });
    
    return !bbHasActed && allOthersActed;
  }
  
  /**
   * Gets the next player who should act
   */
  static getNextActivePlayer(room: GameRoom, fromIndex: number): number {
    const playerCount = room.players.length;
    
    for (let i = 1; i <= playerCount; i++) {
      const nextIndex = (fromIndex + i) % playerCount;
      const player = room.players[nextIndex];
      
      // Player can act if they haven't folded and have chips
      if (player && !player.hasFolded && player.chips > 0) {
        return nextIndex;
      }
    }
    
    return -1; // No valid next player
  }
  
  /**
   * Sets up turn order for the start of a betting round
   */
  static initializeBettingRound(room: GameRoom): void {
    if (room.stage === "preflop") {
      this.initializePreflopBetting(room);
    } else {
      this.initializePostflopBetting(room);
    }
  }
  
  /**
   * Sets up preflop betting order
   */
  private static initializePreflopBetting(room: GameRoom): void {
    // Heads-up preflop: button (small blind) acts first
    if (room.players.length === 2) {
      room.firstToActIndex = room.dealerIndex;
      room.currentTurnIndex = room.dealerIndex;
    } else {
      // Multi-way: first to act is left of big blind
      const bbIndex = this.findBigBlindIndex(room);
      const firstToAct = this.getNextActivePlayer(room, bbIndex);
      room.firstToActIndex = firstToAct;
      room.currentTurnIndex = firstToAct;
    }
    
    console.log(`🎯 [${room.id}] Preflop betting initialized - first to act: ${room.firstToActIndex}`);
  }
  
  /**
   * Sets up post-flop betting order  
   */
  private static initializePostflopBetting(room: GameRoom): void {
    // Post-flop: first active player left of button acts first
    const firstToAct = this.getNextActivePlayer(room, room.dealerIndex);
    room.firstToActIndex = firstToAct;
    room.currentTurnIndex = firstToAct;
    
    // Reset aggressor for new round
    room.lastAggressorIndex = -1;
    
    console.log(`🎯 [${room.id}] Post-flop betting initialized - first to act: ${room.firstToActIndex}`);
  }
}