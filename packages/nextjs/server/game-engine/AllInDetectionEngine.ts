import { GameRoom, PlayerSession, Stage } from "./types";

/**
 * Engine for detecting all-in scenarios and handling fast-forward logic
 * Optimizes gameplay by skipping unnecessary betting rounds when no more betting is possible
 */
export class AllInDetectionEngine {
  
  /**
   * Determines if further betting is possible in the current hand
   */
  static canFurtherBettingOccur(room: GameRoom): boolean {
    const activePlayers = room.players.filter(p => !p.hasFolded);
    
    // No betting possible with 0-1 players
    if (activePlayers.length <= 1) {
      console.log(`🚫 [${room.id}] No further betting: ${activePlayers.length} active players`);
      return false;
    }
    
    // Count players with chips who can still bet
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    
    // No betting if no players have chips
    if (playersWithChips.length === 0) {
      console.log(`🚫 [${room.id}] No further betting: all players all-in`);
      return false;
    }
    
    // No betting if only one player has chips (can't bet against all-in players)
    if (playersWithChips.length === 1) {
      console.log(`🚫 [${room.id}] No further betting: only one player with chips vs all-ins`);
      return false;
    }
    
    // Betting possible if 2+ players have chips
    console.log(`✅ [${room.id}] Further betting possible: ${playersWithChips.length} players with chips`);
    return true;
  }
  
  /**
   * Determines if the current hand should fast-forward to showdown
   */
  static shouldFastForward(room: GameRoom): boolean {
    // Don't fast-forward if we're already at showdown
    if (room.stage === "showdown") {
      return false;
    }
    
    // Fast-forward if no more betting is possible
    if (!this.canFurtherBettingOccur(room)) {
      console.log(`⚡ [${room.id}] Should fast-forward: no more betting possible`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Fast-forwards the hand by dealing all remaining community cards
   * and progressing to showdown
   */
  static fastForwardToShowdown(room: GameRoom): void {
    console.log(`⚡ [${room.id}] Fast-forwarding to showdown from ${room.stage}`);
    
    // Deal remaining community cards based on current stage
    switch (room.stage) {
      case "preflop":
        this.dealFlop(room);
        this.dealTurn(room);
        this.dealRiver(room);
        break;
      case "flop":
        this.dealTurn(room);
        this.dealRiver(room);
        break;
      case "turn":
        this.dealRiver(room);
        break;
      case "river":
        // Already at river, just progress to showdown
        break;
    }
    
    // Progress to showdown
    room.stage = "showdown";
    
    // Clear all turn states since no more actions needed
    room.players.forEach(player => {
      player.isTurn = false;
    });
    
    console.log(`✅ [${room.id}] Fast-forward complete - now at showdown with ${room.communityCards.length} community cards`);
  }
  
  /**
   * Deals the flop (3 cards)
   */
  private static dealFlop(room: GameRoom): void {
    if (room.communityCards.length === 0 && room.deck.length >= 3) {
      const flop = room.deck.splice(0, 3);
      room.communityCards.push(...flop);
      console.log(`🃏 [${room.id}] Fast-forward dealt flop: ${flop.length} cards`);
    }
  }
  
  /**
   * Deals the turn (1 card)
   */
  private static dealTurn(room: GameRoom): void {
    if (room.communityCards.length === 3 && room.deck.length >= 1) {
      const turn = room.deck.splice(0, 1)[0];
      room.communityCards.push(turn);
      console.log(`🃏 [${room.id}] Fast-forward dealt turn`);
    }
  }
  
  /**
   * Deals the river (1 card)
   */
  private static dealRiver(room: GameRoom): void {
    if (room.communityCards.length === 4 && room.deck.length >= 1) {
      const river = room.deck.splice(0, 1)[0];
      room.communityCards.push(river);
      console.log(`🃏 [${room.id}] Fast-forward dealt river`);
    }
  }
  
  /**
   * Analyzes the all-in situation and returns detailed information
   */
  static analyzeAllInSituation(room: GameRoom): AllInSituationAnalysis {
    const activePlayers = room.players.filter(p => !p.hasFolded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allInPlayers = activePlayers.filter(p => p.chips === 0);
    
    return {
      totalActive: activePlayers.length,
      playersWithChips: playersWithChips.length,
      allInPlayers: allInPlayers.length,
      canBet: playersWithChips.length >= 2,
      shouldFastForward: !this.canFurtherBettingOccur(room),
      needsSidePots: allInPlayers.length > 0 && playersWithChips.length > 0
    };
  }
  
  /**
   * Checks if all active players are all-in
   */
  static areAllPlayersAllIn(room: GameRoom): boolean {
    const activePlayers = room.players.filter(p => !p.hasFolded);
    return activePlayers.length > 0 && activePlayers.every(p => p.chips === 0);
  }
  
  /**
   * Checks if only one player has chips remaining
   */
  static isOnlyOnePlayerWithChips(room: GameRoom): boolean {
    const activePlayers = room.players.filter(p => !p.hasFolded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    return playersWithChips.length === 1;
  }
}

/**
 * Analysis result for all-in situations
 */
export interface AllInSituationAnalysis {
  totalActive: number;
  playersWithChips: number;
  allInPlayers: number;
  canBet: boolean;
  shouldFastForward: boolean;
  needsSidePots: boolean;
}