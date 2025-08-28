import { GameRoom, PlayerSession, Stage } from "../types";

/**
 * Player position types in poker
 */
export enum Position {
  DEALER = "dealer",
  SMALL_BLIND = "small_blind", 
  BIG_BLIND = "big_blind",
  UTG = "utg",                 // Under the gun
  UTG_1 = "utg_1",             // UTG + 1
  UTG_2 = "utg_2",             // UTG + 2  
  MIDDLE = "middle",           // Middle position
  CUTOFF = "cutoff",           // Cut-off
  HIJACK = "hijack"            // Hijack
}

/**
 * Position information for a player
 */
interface PositionInfo {
  playerIndex: number;
  playerId: string;
  position: Position;
  actingOrder: number;         // Order for current stage (0 = first to act)
  isButton: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

/**
 * Blind posting result
 */
interface BlindResult {
  smallBlindIndex: number;
  bigBlindIndex: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  totalPosted: number;
}

/**
 * Manages player positions, blinds, and acting order
 * Handles dealer button advancement and blind posting logic
 */
export class PositionManager {
  private room: GameRoom;
  private positionMap: Map<number, PositionInfo> = new Map();

  constructor(room: GameRoom) {
    this.room = room;
    this.calculatePositions();
  }

  /**
   * Calculate positions for all players
   */
  private calculatePositions(): void {
    this.positionMap.clear();
    
    const activePlayers = this.room.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => !player.hasFolded);

    if (activePlayers.length === 0) {
      console.warn(`⚠️ [${this.room.id}] No active players for position calculation`);
      return;
    }

    const dealerIndex = this.room.dealerIndex;
    const playerCount = activePlayers.length;
    const isHeadsUp = playerCount === 2;

    // Calculate positions based on player count
    for (let i = 0; i < playerCount; i++) {
      const { player, index } = activePlayers[i];
      const position = this.calculatePlayerPosition(index, dealerIndex, playerCount, isHeadsUp);
      const actingOrder = this.calculateActingOrder(index, this.room.stage, dealerIndex, isHeadsUp);
      
      const positionInfo: PositionInfo = {
        playerIndex: index,
        playerId: player.id,
        position,
        actingOrder,
        isButton: index === dealerIndex,
        isSmallBlind: index === this.getSmallBlindIndex(),
        isBigBlind: index === this.getBigBlindIndex()
      };

      this.positionMap.set(index, positionInfo);
    }

    console.log(`🎯 [${this.room.id}] Positions calculated for ${playerCount} players:`,
      Array.from(this.positionMap.values()).map(p => `${p.playerId}:${p.position}`).join(', '));
  }

  /**
   * Calculate position for a specific player
   */
  private calculatePlayerPosition(
    playerIndex: number, 
    dealerIndex: number, 
    playerCount: number, 
    isHeadsUp: boolean
  ): Position {
    
    if (playerIndex === dealerIndex) {
      return Position.DEALER;
    }

    if (isHeadsUp) {
      // In heads-up: dealer is small blind, other player is big blind
      return playerIndex === dealerIndex ? Position.SMALL_BLIND : Position.BIG_BLIND;
    }

    // Multi-way positions
    const sbIndex = this.getSmallBlindIndex();
    const bbIndex = this.getBigBlindIndex();

    if (playerIndex === sbIndex) return Position.SMALL_BLIND;
    if (playerIndex === bbIndex) return Position.BIG_BLIND;

    // Calculate relative position from dealer
    const relativePosition = (playerIndex - dealerIndex + this.room.players.length) % this.room.players.length;
    
    switch (playerCount) {
      case 3:
        return relativePosition === 1 ? Position.SMALL_BLIND : 
               relativePosition === 2 ? Position.BIG_BLIND : Position.DEALER;
               
      case 4:
        return relativePosition === 3 ? Position.UTG : Position.MIDDLE;
        
      case 5:
        return relativePosition === 3 ? Position.UTG : 
               relativePosition === 4 ? Position.UTG_1 : Position.MIDDLE;
               
      case 6:
        return relativePosition === 3 ? Position.UTG :
               relativePosition === 4 ? Position.UTG_1 :
               relativePosition === 5 ? Position.MIDDLE : Position.CUTOFF;
               
      default:
        // For 7+ players, assign based on relative position
        if (relativePosition === 3) return Position.UTG;
        if (relativePosition === 4) return Position.UTG_1;
        if (relativePosition === 5) return Position.UTG_2;
        if (relativePosition === playerCount - 2) return Position.CUTOFF;
        if (relativePosition === playerCount - 3) return Position.HIJACK;
        return Position.MIDDLE;
    }
  }

  /**
   * Calculate acting order for current stage
   */
  private calculateActingOrder(
    playerIndex: number, 
    stage: Stage, 
    dealerIndex: number, 
    isHeadsUp: boolean
  ): number {
    
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    const playerCount = activePlayers.length;

    switch (stage) {
      case "preflop":
        return this.getPreflopActingOrder(playerIndex, dealerIndex, isHeadsUp, playerCount);
        
      case "flop":
      case "turn":
      case "river":
        return this.getPostflopActingOrder(playerIndex, dealerIndex, isHeadsUp);
        
      default:
        return 0;
    }
  }

  /**
   * Get preflop acting order (BB acts last)
   */
  private getPreflopActingOrder(
    playerIndex: number, 
    dealerIndex: number, 
    isHeadsUp: boolean, 
    playerCount: number
  ): number {
    
    if (isHeadsUp) {
      // Heads-up preflop: SB (dealer) acts first, BB acts last
      return playerIndex === dealerIndex ? 0 : 1;
    }

    // Multi-way preflop: UTG first, BB last
    const bbIndex = this.getBigBlindIndex();
    
    if (playerIndex === bbIndex) {
      return playerCount - 1; // BB always last
    }

    // Calculate clockwise distance from UTG (left of BB)
    const utgIndex = (bbIndex + 1) % this.room.players.length;
    let order = 0;
    let currentIndex = utgIndex;
    
    while (currentIndex !== playerIndex && order < playerCount - 1) {
      currentIndex = (currentIndex + 1) % this.room.players.length;
      
      // Skip if player is folded
      if (!this.room.players[currentIndex]?.hasFolded) {
        order++;
      }
    }
    
    return order;
  }

  /**
   * Get postflop acting order (clockwise from left of button)
   */
  private getPostflopActingOrder(
    playerIndex: number, 
    dealerIndex: number, 
    isHeadsUp: boolean
  ): number {
    
    if (isHeadsUp) {
      // Heads-up postflop: non-button acts first
      return playerIndex === dealerIndex ? 1 : 0;
    }

    // Multi-way postflop: clockwise from left of button
    let order = 0;
    let currentIndex = (dealerIndex + 1) % this.room.players.length;
    
    while (currentIndex !== playerIndex) {
      // Only count non-folded players
      if (!this.room.players[currentIndex]?.hasFolded) {
        order++;
      }
      currentIndex = (currentIndex + 1) % this.room.players.length;
    }
    
    return order;
  }

  /**
   * Get small blind player index
   */
  public getSmallBlindIndex(): number {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    if (activePlayers.length === 2) {
      // Heads-up: dealer is small blind
      return this.room.dealerIndex;
    }
    
    // Multi-way: small blind is one position clockwise from dealer
    return (this.room.dealerIndex + 1) % this.room.players.length;
  }

  /**
   * Get big blind player index
   */
  public getBigBlindIndex(): number {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    if (activePlayers.length === 2) {
      // Heads-up: non-dealer is big blind
      return this.room.dealerIndex === 0 ? 1 : 0;
    }
    
    // Multi-way: big blind is two positions clockwise from dealer
    return (this.room.dealerIndex + 2) % this.room.players.length;
  }

  /**
   * Post blinds and return posting information
   */
  public postBlinds(): BlindResult {
    const sbIndex = this.getSmallBlindIndex();
    const bbIndex = this.getBigBlindIndex();
    
    const sbPlayer = this.room.players[sbIndex];
    const bbPlayer = this.room.players[bbIndex];
    
    if (!sbPlayer || !bbPlayer) {
      throw new Error(`Invalid blind player indices: SB=${sbIndex}, BB=${bbIndex}`);
    }

    // Calculate actual blind amounts (may be less if player doesn't have enough chips)
    const sbAmount = Math.min(this.room.smallBlindAmount, sbPlayer.chips);
    const bbAmount = Math.min(this.room.bigBlindAmount, bbPlayer.chips);

    // Post small blind
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;

    // Post big blind
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;

    // Add to pot
    const totalPosted = sbAmount + bbAmount;
    this.room.pot += totalPosted;

    // Record blind actions in action history
    this.room.actionHistory.push({
      playerId: sbPlayer.id,
      playerIndex: sbIndex,
      action: "blind",
      amount: sbAmount,
      timestamp: Date.now()
    });

    this.room.actionHistory.push({
      playerId: bbPlayer.id,
      playerIndex: bbIndex,
      action: "blind",
      amount: bbAmount,
      timestamp: Date.now()
    });

    console.log(`💰 [${this.room.id}] Blinds posted - SB: ${sbPlayer.id} $${sbAmount}, BB: ${bbPlayer.id} $${bbAmount}`);

    return {
      smallBlindIndex: sbIndex,
      bigBlindIndex: bbIndex,
      smallBlindAmount: sbAmount,
      bigBlindAmount: bbAmount,
      totalPosted
    };
  }

  /**
   * Advance dealer button to next active player
   */
  public advanceButton(): void {
    const activePlayers = this.room.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.chips > 0); // Only players with chips can be dealer

    if (activePlayers.length < 2) {
      console.warn(`⚠️ [${this.room.id}] Not enough players to advance button`);
      return;
    }

    const currentDealerIndex = this.room.dealerIndex;
    let nextDealerIndex = currentDealerIndex;
    
    // Find next active player clockwise
    for (let i = 1; i <= this.room.players.length; i++) {
      const candidateIndex = (currentDealerIndex + i) % this.room.players.length;
      const candidate = this.room.players[candidateIndex];
      
      if (candidate && candidate.chips > 0) {
        nextDealerIndex = candidateIndex;
        break;
      }
    }

    // Update dealer button
    this.room.players.forEach((player, index) => {
      player.isDealer = index === nextDealerIndex;
    });

    const oldDealerId = this.room.players[currentDealerIndex]?.id || 'unknown';
    const newDealerId = this.room.players[nextDealerIndex]?.id || 'unknown';
    
    this.room.dealerIndex = nextDealerIndex;
    console.log(`🔄 [${this.room.id}] Button advanced from ${oldDealerId} to ${newDealerId}`);

    // Recalculate positions with new dealer
    this.calculatePositions();
  }

  /**
   * Get acting order for specific stage
   */
  public getActingOrder(stage: Stage): PlayerSession[] {
    const positions = Array.from(this.positionMap.values())
      .filter(pos => {
        const player = this.room.players[pos.playerIndex];
        return player && !player.hasFolded;
      })
      .sort((a, b) => {
        // Recalculate acting order for requested stage
        const aOrder = this.calculateActingOrder(a.playerIndex, stage, this.room.dealerIndex, 
          this.room.players.filter(p => !p.hasFolded).length === 2);
        const bOrder = this.calculateActingOrder(b.playerIndex, stage, this.room.dealerIndex,
          this.room.players.filter(p => !p.hasFolded).length === 2);
        return aOrder - bOrder;
      });

    return positions.map(pos => this.room.players[pos.playerIndex]).filter(p => p);
  }

  /**
   * Get position for specific player
   */
  public getPlayerPosition(playerIndex: number): PositionInfo | null {
    return this.positionMap.get(playerIndex) || null;
  }

  /**
   * Get all position information
   */
  public getAllPositions(): PositionInfo[] {
    return Array.from(this.positionMap.values());
  }

  /**
   * Check if position calculation is valid
   */
  public isValid(): boolean {
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    
    // Check that we have position info for all active players
    for (let i = 0; i < this.room.players.length; i++) {
      const player = this.room.players[i];
      if (player && !player.hasFolded) {
        if (!this.positionMap.has(i)) {
          return false;
        }
      }
    }

    // Check that exactly one player is marked as dealer, SB, BB
    const positions = Array.from(this.positionMap.values());
    const dealerCount = positions.filter(p => p.isButton).length;
    const sbCount = positions.filter(p => p.isSmallBlind).length;  
    const bbCount = positions.filter(p => p.isBigBlind).length;

    if (activePlayers.length >= 2) {
      if (dealerCount !== 1 || sbCount !== 1 || bbCount !== 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): object {
    return {
      dealerIndex: this.room.dealerIndex,
      smallBlindIndex: this.getSmallBlindIndex(),
      bigBlindIndex: this.getBigBlindIndex(),
      positions: Array.from(this.positionMap.values()).map(p => ({
        player: p.playerId,
        position: p.position,
        actingOrder: p.actingOrder,
        isButton: p.isButton,
        isSB: p.isSmallBlind,
        isBB: p.isBigBlind
      }))
    };
  }

  /**
   * Refresh position calculations (call after player changes)
   */
  public refresh(): void {
    this.calculatePositions();
  }
}