import { GameRoom, PlayerSession, Stage } from "../types";

/**
 * Turn sequence entry representing a player in the turn order
 */
interface TurnEntry {
  playerIndex: number;
  playerId: string;
  canAct: boolean;
  hasActed: boolean;
}

/**
 * Data structure for managing turn order as a proper sequence
 * Handles turn advancement, validation, and round completion detection
 */
export class TurnOrderManager {
  private turnSequence: TurnEntry[] = [];
  private currentTurnPosition: number = 0;
  private roundStartPosition: number = 0;
  private stage: Stage;
  private room: GameRoom;

  constructor(room: GameRoom) {
    this.room = room;
    this.stage = room.stage;
    this.initialize();
  }

  /**
   * Initialize turn order based on current stage and players
   */
  private initialize(): void {
    this.turnSequence = [];
    this.currentTurnPosition = 0;
    
    const activePlayers = this.room.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => !player.hasFolded);

    if (activePlayers.length === 0) {
      console.warn(`⚠️ [${this.room.id}] No active players for turn order`);
      return;
    }

    // Create turn sequence based on stage
    const actingOrder = this.calculateActingOrder(activePlayers);
    
    this.turnSequence = actingOrder.map(({ player, index }) => ({
      playerIndex: index,
      playerId: player.id,
      canAct: this.canPlayerAct(player),
      hasActed: false
    }));

    // Find first player who can act
    this.currentTurnPosition = this.findFirstActingPosition();
    this.roundStartPosition = this.currentTurnPosition;

    console.log(`🎯 [${this.room.id}] Turn order initialized for ${this.stage}:`, 
      this.turnSequence.map(t => `${t.playerId}(${t.playerIndex})`).join(' → '));
  }

  /**
   * Calculate acting order based on stage and player positions
   */
  private calculateActingOrder(activePlayers: { player: PlayerSession, index: number }[]): { player: PlayerSession, index: number }[] {
    const dealerIndex = this.room.dealerIndex;
    const isHeadsUp = activePlayers.length === 2;

    switch (this.stage) {
      case "preflop":
        return this.getPreflopOrder(activePlayers, dealerIndex, isHeadsUp);
      
      case "flop":
      case "turn": 
      case "river":
        return this.getPostflopOrder(activePlayers, dealerIndex, isHeadsUp);
        
      default:
        // For waiting/showdown, no specific order needed
        return activePlayers;
    }
  }

  /**
   * Get preflop acting order - BB acts LAST
   */
  private getPreflopOrder(
    activePlayers: { player: PlayerSession, index: number }[], 
    dealerIndex: number, 
    isHeadsUp: boolean
  ): { player: PlayerSession, index: number }[] {
    
    if (isHeadsUp) {
      // Heads-up preflop: SB (dealer) acts first, BB acts last
      const dealer = activePlayers.find(p => p.index === dealerIndex);
      const nonDealer = activePlayers.find(p => p.index !== dealerIndex);
      
      if (!dealer || !nonDealer) {
        console.error(`❌ [${this.room.id}] Invalid heads-up setup`);
        return activePlayers;
      }
      
      return [dealer, nonDealer]; // SB first, BB last
    }

    // Multi-way preflop: UTG → ... → SB → BB (BB acts last)
    const playerCount = this.room.players.length;
    const bbIndex = (dealerIndex + 2) % playerCount;
    const sbIndex = (dealerIndex + 1) % playerCount;
    
    // Start from UTG (left of BB) and go clockwise, ending with BB
    const orderedPlayers: { player: PlayerSession, index: number }[] = [];
    
    // Add all players clockwise from UTG, but save BB for last
    for (let offset = 1; offset <= playerCount; offset++) {
      const currentIndex = (bbIndex + offset) % playerCount;
      const playerEntry = activePlayers.find(p => p.index === currentIndex);
      
      if (playerEntry) {
        if (currentIndex === bbIndex) {
          // Skip BB for now, will add last
          continue;
        }
        orderedPlayers.push(playerEntry);
      }
    }
    
    // Add BB last
    const bbPlayer = activePlayers.find(p => p.index === bbIndex);
    if (bbPlayer) {
      orderedPlayers.push(bbPlayer);
    }
    
    return orderedPlayers;
  }

  /**
   * Get postflop acting order - standard clockwise from left of button
   */
  private getPostflopOrder(
    activePlayers: { player: PlayerSession, index: number }[], 
    dealerIndex: number, 
    isHeadsUp: boolean
  ): { player: PlayerSession, index: number }[] {
    
    if (isHeadsUp) {
      // Heads-up postflop: non-button acts first
      const nonDealer = activePlayers.find(p => p.index !== dealerIndex);
      const dealer = activePlayers.find(p => p.index === dealerIndex);
      
      if (!nonDealer || !dealer) {
        console.error(`❌ [${this.room.id}] Invalid heads-up setup`);
        return activePlayers;
      }
      
      return [nonDealer, dealer];
    }

    // Multi-way postflop: clockwise from left of button
    const playerCount = this.room.players.length;
    const orderedPlayers: { player: PlayerSession, index: number }[] = [];
    
    for (let offset = 1; offset <= playerCount; offset++) {
      const currentIndex = (dealerIndex + offset) % playerCount;
      const playerEntry = activePlayers.find(p => p.index === currentIndex);
      
      if (playerEntry) {
        orderedPlayers.push(playerEntry);
      }
    }
    
    return orderedPlayers;
  }

  /**
   * Find first position in sequence where player can act
   */
  private findFirstActingPosition(): number {
    for (let i = 0; i < this.turnSequence.length; i++) {
      if (this.turnSequence[i].canAct) {
        return i;
      }
    }
    return 0; // Fallback
  }

  /**
   * Advance to next player in turn order
   */
  public next(): boolean {
    if (this.turnSequence.length === 0) {
      return false;
    }

    // Mark current player as having acted
    if (this.currentTurnPosition < this.turnSequence.length) {
      this.turnSequence[this.currentTurnPosition].hasActed = true;
    }

    // Find next player who can act
    const startPosition = this.currentTurnPosition;
    let nextPosition = (this.currentTurnPosition + 1) % this.turnSequence.length;
    let attempts = 0;
    
    while (attempts < this.turnSequence.length) {
      const turnEntry = this.turnSequence[nextPosition];
      
      if (turnEntry.canAct && !turnEntry.hasActed) {
        this.currentTurnPosition = nextPosition;
        this.updateRoomState();
        return true;
      }
      
      nextPosition = (nextPosition + 1) % this.turnSequence.length;
      attempts++;
    }

    // No more players can act
    console.log(`🔄 [${this.room.id}] No more players can act in turn sequence`);
    return false;
  }

  /**
   * Get current player who should act
   */
  public getCurrentPlayer(): { player: PlayerSession, playerIndex: number } | null {
    if (this.turnSequence.length === 0 || this.currentTurnPosition >= this.turnSequence.length) {
      return null;
    }

    const turnEntry = this.turnSequence[this.currentTurnPosition];
    const player = this.room.players[turnEntry.playerIndex];
    
    if (!player) {
      console.error(`❌ [${this.room.id}] Invalid player index in turn sequence: ${turnEntry.playerIndex}`);
      return null;
    }

    return {
      player,
      playerIndex: turnEntry.playerIndex
    };
  }

  /**
   * Check if player can legally act
   */
  private canPlayerAct(player: PlayerSession): boolean {
    if (!player || player.hasFolded) {
      return false;
    }

    // All-in players can't act (but can still win)
    if (player.chips === 0) {
      return false;
    }

    return true;
  }

  /**
   * Update room state to reflect current turn
   */
  private updateRoomState(): void {
    // Clear all turn flags
    this.room.players.forEach(player => {
      player.isTurn = false;
    });

    const currentPlayerInfo = this.getCurrentPlayer();
    if (currentPlayerInfo) {
      this.room.currentTurnIndex = currentPlayerInfo.playerIndex;
      currentPlayerInfo.player.isTurn = true;
      
      console.log(`👉 [${this.room.id}] Turn set to ${currentPlayerInfo.player.id} (index ${currentPlayerInfo.playerIndex})`);
    } else {
      this.room.currentTurnIndex = -1;
    }
  }

  /**
   * Check if we've completed a full round of betting
   */
  public hasCompletedRound(): boolean {
    // Check if all players who can act have acted
    const playersWhoCanAct = this.turnSequence.filter(t => t.canAct);
    const playersWhoHaveActed = this.turnSequence.filter(t => t.canAct && t.hasActed);
    
    return playersWhoCanAct.length > 0 && playersWhoCanAct.length === playersWhoHaveActed.length;
  }

  /**
   * Reset turn order for new betting round
   */
  public reset(): void {
    this.initialize();
  }

  /**
   * Mark a specific player as having acted (for external action tracking)
   */
  public markPlayerActed(playerIndex: number): void {
    const turnEntry = this.turnSequence.find(t => t.playerIndex === playerIndex);
    if (turnEntry) {
      turnEntry.hasActed = true;
    }
  }

  /**
   * Check if a specific player has acted this round
   */
  public hasPlayerActed(playerIndex: number): boolean {
    const turnEntry = this.turnSequence.find(t => t.playerIndex === playerIndex);
    return turnEntry ? turnEntry.hasActed : false;
  }

  /**
   * Get debug information about current turn state
   */
  public getDebugInfo(): object {
    return {
      stage: this.stage,
      currentPosition: this.currentTurnPosition,
      roundStartPosition: this.roundStartPosition,
      turnSequence: this.turnSequence.map(t => ({
        player: t.playerId,
        index: t.playerIndex,
        canAct: t.canAct,
        hasActed: t.hasActed
      })),
      currentPlayer: this.getCurrentPlayer()?.player.id || 'none'
    };
  }

  /**
   * Get all players in acting order
   */
  public getActingOrder(): PlayerSession[] {
    return this.turnSequence
      .map(t => this.room.players[t.playerIndex])
      .filter(p => p !== undefined);
  }

  /**
   * Check if turn order is valid
   */
  public isValid(): boolean {
    // Check that we have players
    if (this.turnSequence.length === 0) {
      return false;
    }

    // Check that all player indices are valid
    for (const turnEntry of this.turnSequence) {
      if (turnEntry.playerIndex < 0 || turnEntry.playerIndex >= this.room.players.length) {
        return false;
      }
      
      const player = this.room.players[turnEntry.playerIndex];
      if (!player || player.id !== turnEntry.playerId) {
        return false;
      }
    }

    return true;
  }
}