import { GameRoom, PlayerSession } from "./core/types";

/**
 * Comprehensive game state validation engine
 * Ensures all game logic maintains consistency and detects invalid states
 */
export class GameStateValidator {
  
  /**
   * Validates the entire game room state for consistency
   */
  static validateGameRoom(room: GameRoom): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic room state
    this.validateBasicRoomState(room, errors, warnings);
    
    // Validate player states
    this.validatePlayerStates(room, errors, warnings);
    
    // Validate turn order consistency
    this.validateTurnOrder(room, errors, warnings);
    
    // Validate betting state
    this.validateBettingState(room, errors, warnings);
    
    // Validate stage-specific rules
    this.validateStageRules(room, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      criticalIssues: errors.filter(e => this.isCriticalError(e)),
      summary: this.generateSummary(room, errors, warnings)
    };
  }

  /**
   * Validates basic room state properties
   */
  private static validateBasicRoomState(room: GameRoom, errors: string[], warnings: string[]): void {
    // Validate room ID
    if (!room.id || room.id.trim().length === 0) {
      errors.push("Room ID is missing or empty");
    }

    // Validate dealer index
    if (room.players.length > 0) {
      if (room.dealerIndex < 0 || room.dealerIndex >= room.players.length) {
        errors.push(`Invalid dealer index ${room.dealerIndex} for ${room.players.length} players`);
      }
    }

    // Validate betting amounts
    if (room.smallBlindAmount <= 0) {
      errors.push(`Invalid small blind amount: ${room.smallBlindAmount}`);
    }
    if (room.bigBlindAmount <= 0) {
      errors.push(`Invalid big blind amount: ${room.bigBlindAmount}`);
    }
    if (room.bigBlindAmount <= room.smallBlindAmount) {
      errors.push(`Big blind (${room.bigBlindAmount}) must be larger than small blind (${room.smallBlindAmount})`);
    }

    // Validate pot
    if (room.pot < 0) {
      errors.push(`Negative pot amount: ${room.pot}`);
    }

    // Validate community cards for stage
    const expectedCards = this.getExpectedCommunityCards(room.stage);
    if (expectedCards !== null && room.communityCards.length !== expectedCards) {
      warnings.push(`Stage ${room.stage} should have ${expectedCards} community cards, but has ${room.communityCards.length}`);
    }
  }

  /**
   * Validates all player states for consistency
   */
  private static validatePlayerStates(room: GameRoom, errors: string[], warnings: string[]): void {
    const seenSeats = new Set<number>();
    const seenPlayerIds = new Set<string>();
    let activeCount = 0;
    let dealerCount = 0;
    let turnCount = 0;

    room.players.forEach((player, index) => {
      // Check for duplicate seats
      if (seenSeats.has(player.seat)) {
        errors.push(`Duplicate seat ${player.seat} for player ${player.id}`);
      }
      seenSeats.add(player.seat);

      // Check for duplicate player IDs
      if (seenPlayerIds.has(player.id)) {
        errors.push(`Duplicate player ID ${player.id}`);
      }
      seenPlayerIds.add(player.id);

      // Validate seat range
      if (player.seat < 0 || player.seat > 8) {
        errors.push(`Invalid seat ${player.seat} for player ${player.id} (must be 0-8)`);
      }

      // Validate chips
      if (player.chips < 0) {
        errors.push(`Player ${player.id} has negative chips: ${player.chips}`);
      }

      // Validate current bet
      if (player.currentBet < 0) {
        errors.push(`Player ${player.id} has negative current bet: ${player.currentBet}`);
      }

      // Count states
      if (!player.hasFolded && player.chips >= 0) activeCount++;
      if (player.isDealer) dealerCount++;
      if (player.isTurn) turnCount++;

      // Validate turn state consistency
      if (player.isTurn && room.currentTurnIndex !== index) {
        errors.push(`Player ${player.id} has isTurn=true but currentTurnIndex=${room.currentTurnIndex} points to index ${index}`);
      }
      if (!player.isTurn && room.currentTurnIndex === index && room.stage !== "waiting") {
        errors.push(`currentTurnIndex points to player ${player.id} but they don't have isTurn=true`);
      }

      // Validate dealer state
      if (player.isDealer && room.dealerIndex !== index) {
        errors.push(`Player ${player.id} has isDealer=true but dealerIndex=${room.dealerIndex} points to index ${index}`);
      }
    });

    // Validate counts
    if (room.stage !== "waiting" && dealerCount !== 1) {
      errors.push(`Expected exactly 1 dealer, found ${dealerCount}`);
    }
    
    if (room.stage !== "waiting" && room.stage !== "showdown" && turnCount > 1) {
      errors.push(`Multiple players have isTurn=true: ${turnCount}`);
    }

    if (room.players.length >= 2 && activeCount < 1 && room.stage !== "waiting") {
      warnings.push(`No active players remaining in non-waiting stage`);
    }
  }

  /**
   * Validates turn order consistency
   */
  private static validateTurnOrder(room: GameRoom, errors: string[], warnings: string[]): void {
    if (room.stage === "waiting" || room.players.length < 2) {
      return; // No turn order validation needed
    }

    // Validate turn index bounds
    if (room.currentTurnIndex < -1 || room.currentTurnIndex >= room.players.length) {
      errors.push(`currentTurnIndex ${room.currentTurnIndex} out of bounds for ${room.players.length} players`);
    }

    if (room.firstToActIndex < -1 || room.firstToActIndex >= room.players.length) {
      errors.push(`firstToActIndex ${room.firstToActIndex} out of bounds for ${room.players.length} players`);
    }

    if (room.lastAggressorIndex < -1 || room.lastAggressorIndex >= room.players.length) {
      errors.push(`lastAggressorIndex ${room.lastAggressorIndex} out of bounds for ${room.players.length} players`);
    }

    // Validate that current turn player can actually act
    if (room.currentTurnIndex >= 0) {
      const currentPlayer = room.players[room.currentTurnIndex];
      if (currentPlayer.hasFolded) {
        errors.push(`Current turn player ${currentPlayer.id} has already folded`);
      }
      if (currentPlayer.chips === 0 && room.stage !== "showdown") {
        warnings.push(`Current turn player ${currentPlayer.id} is all-in but still has turn`);
      }
    }
  }

  /**
   * Validates betting state consistency
   */
  private static validateBettingState(room: GameRoom, errors: string[], warnings: string[]): void {
    if (room.stage === "waiting") return;

    const activePlayers = room.players.filter(p => !p.hasFolded);
    const totalBets = room.players.reduce((sum, p) => sum + p.currentBet, 0);

    // Validate pot consistency
    if (Math.abs(room.pot - totalBets) > 0.01) { // Allow for small rounding errors
      errors.push(`Pot (${room.pot}) doesn't match sum of player bets (${totalBets})`);
    }

    // Validate betting ranges for active players
    const maxBet = Math.max(0, ...activePlayers.map(p => p.currentBet));
    activePlayers.forEach(player => {
      if (player.chips > 0 && player.currentBet < maxBet) {
        const shortfall = maxBet - player.currentBet;
        if (shortfall > player.chips) {
          // Player should be all-in
          warnings.push(`Player ${player.id} is short ${shortfall} but has ${player.chips} chips - should be all-in`);
        }
      }
    });

    // Validate minimum bet
    if (room.minBet <= 0) {
      errors.push(`Invalid minimum bet: ${room.minBet}`);
    }
  }

  /**
   * Validates stage-specific rules
   */
  private static validateStageRules(room: GameRoom, errors: string[], warnings: string[]): void {
    switch (room.stage) {
      case "preflop":
        this.validatePreflopRules(room, errors, warnings);
        break;
      case "flop":
      case "turn":
      case "river":
        this.validatePostflopRules(room, errors, warnings);
        break;
      case "showdown":
        this.validateShowdownRules(room, errors, warnings);
        break;
    }
  }

  /**
   * Validates preflop-specific rules
   */
  private static validatePreflopRules(room: GameRoom, errors: string[], warnings: string[]): void {
    // Should have no community cards
    if (room.communityCards.length > 0) {
      errors.push(`Preflop should have 0 community cards, has ${room.communityCards.length}`);
    }

    // All players should have 2 hole cards
    room.players.forEach(player => {
      if (!player.hasFolded && player.hand.length !== 2) {
        errors.push(`Player ${player.id} should have 2 hole cards in preflop, has ${player.hand.length}`);
      }
    });

    // Validate blinds are posted
    const smallBlindIndex = this.getSmallBlindIndex(room);
    const bigBlindIndex = this.getBigBlindIndex(room);
    
    if (smallBlindIndex >= 0 && room.players[smallBlindIndex] && room.players[smallBlindIndex].currentBet < room.smallBlindAmount) {
      warnings.push(`Small blind player hasn't posted full blind amount`);
    }
    
    if (bigBlindIndex >= 0 && room.players[bigBlindIndex] && room.players[bigBlindIndex].currentBet < room.bigBlindAmount) {
      warnings.push(`Big blind player hasn't posted full blind amount`);
    }
  }

  /**
   * Validates postflop rules
   */
  private static validatePostflopRules(room: GameRoom, errors: string[], warnings: string[]): void {
    const expectedCards = this.getExpectedCommunityCards(room.stage);
    if (expectedCards !== null && room.communityCards.length !== expectedCards) {
      errors.push(`${room.stage} should have ${expectedCards} community cards, has ${room.communityCards.length}`);
    }

    // All current bets should be 0 at start of new betting round
    const hasCurrentBets = room.players.some(p => p.currentBet > 0);
    if (!hasCurrentBets && room.stage !== "preflop") {
      // This is normal for start of postflop betting rounds
    }
  }

  /**
   * Validates showdown rules
   */
  private static validateShowdownRules(room: GameRoom, errors: string[], warnings: string[]): void {
    if (room.communityCards.length !== 5) {
      errors.push(`Showdown should have 5 community cards, has ${room.communityCards.length}`);
    }

    // All players should have isTurn = false in showdown
    const playersWithTurn = room.players.filter(p => p.isTurn);
    if (playersWithTurn.length > 0) {
      warnings.push(`${playersWithTurn.length} players still have isTurn=true during showdown`);
    }
  }

  /**
   * Gets expected number of community cards for a stage
   */
  private static getExpectedCommunityCards(stage: string): number | null {
    switch (stage) {
      case "preflop": return 0;
      case "flop": return 3;
      case "turn": return 4;
      case "river": return 5;
      case "showdown": return 5;
      default: return null;
    }
  }

  /**
   * Gets the small blind player index
   */
  private static getSmallBlindIndex(room: GameRoom): number {
    if (room.players.length === 2) {
      return room.dealerIndex; // Heads-up: dealer is small blind
    }
    return (room.dealerIndex + 1) % room.players.length;
  }

  /**
   * Gets the big blind player index
   */
  private static getBigBlindIndex(room: GameRoom): number {
    if (room.players.length === 2) {
      return room.dealerIndex === 0 ? 1 : 0; // Heads-up: non-dealer is big blind
    }
    return (room.dealerIndex + 2) % room.players.length;
  }

  /**
   * Determines if an error is critical
   */
  private static isCriticalError(error: string): boolean {
    const criticalKeywords = ['negative', 'duplicate', 'out of bounds', 'missing', 'invalid'];
    return criticalKeywords.some(keyword => error.toLowerCase().includes(keyword));
  }

  /**
   * Generates a validation summary
   */
  private static generateSummary(room: GameRoom, errors: string[], warnings: string[]): string {
    const activePlayers = room.players.filter(p => !p.hasFolded).length;
    const totalChips = room.players.reduce((sum, p) => sum + p.chips + p.currentBet, 0);
    
    return `Room ${room.id}: ${room.players.length} players (${activePlayers} active), ` +
           `Stage: ${room.stage}, Pot: $${room.pot}, Total chips: $${totalChips}, ` +
           `Errors: ${errors.length}, Warnings: ${warnings.length}`;
  }

  /**
   * Quick validation for critical errors only
   */
  static validateCritical(room: GameRoom): { isValid: boolean; criticalErrors: string[] } {
    const result = this.validateGameRoom(room);
    return {
      isValid: result.criticalIssues.length === 0,
      criticalErrors: result.criticalIssues
    };
  }

  /**
   * Validates a specific aspect of game state
   */
  static validateAspect(room: GameRoom, aspect: ValidationAspect): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (aspect) {
      case 'players':
        this.validatePlayerStates(room, errors, warnings);
        break;
      case 'betting':
        this.validateBettingState(room, errors, warnings);
        break;
      case 'turn-order':
        this.validateTurnOrder(room, errors, warnings);
        break;
      case 'stage':
        this.validateStageRules(room, errors, warnings);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      criticalIssues: errors.filter(e => this.isCriticalError(e)),
      summary: `${aspect} validation: ${errors.length} errors, ${warnings.length} warnings`
    };
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
  summary: string;
}

/**
 * Validation aspects that can be checked individually
 */
export type ValidationAspect = 'players' | 'betting' | 'turn-order' | 'stage';