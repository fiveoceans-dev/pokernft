import { GameRoom, PlayerSession } from "../types";
// Legacy imports removed - these classes are now in GameController
// import { BettingRuleEngine } from "../legacy/BettingRuleEngine";
// import { AllInDetectionEngine } from "../legacy/AllInDetectionEngine";
// import { TurnOrderManager } from "../legacy/TurnOrderManager";

// TODO: Update tests to use GameController instead of legacy classes
import { GameStateValidator } from "../GameStateValidator";

/**
 * Comprehensive test suite for new betting scenarios
 * Tests preflop BB last action rule and all-in fast-forward logic
 */
describe.skip("Betting Scenarios - NEEDS MIGRATION TO GAMECONTROLLER", () => {
  
  /**
   * Creates a test room with specified number of players
   */
  function createTestRoom(playerCount: number = 3, stage: string = "preflop"): GameRoom {
    const room: GameRoom = {
      id: "test-room",
      players: [],
      dealerIndex: 0,
      currentTurnIndex: 0,
      firstToActIndex: 0,
      lastAggressorIndex: -1,
      stage: stage as any,
      pot: 0,
      communityCards: [],
      minBet: 100,
      smallBlindAmount: 50,
      bigBlindAmount: 100,
      deck: []
    };

    // Add players
    for (let i = 0; i < playerCount; i++) {
      const player: PlayerSession = {
        id: `player-${i}`,
        nickname: `Player ${i}`,
        seat: i,
        chips: 1000,
        tableId: "test-room",
        isDealer: i === 0,
        isTurn: false,
        hand: [{ suit: "hearts", rank: "A" }, { suit: "spades", rank: "K" }],
        hasFolded: false,
        currentBet: 0
      };
      room.players.push(player);
    }

    return room;
  }

  describe("BettingRuleEngine", () => {
    
    test("preflop BB last action rule - unopened pot", () => {
      const room = createTestRoom(3);
      
      // Set up blinds
      room.players[1].currentBet = 50; // Small blind
      room.players[2].currentBet = 100; // Big blind
      room.pot = 150;
      
      // Everyone calls the big blind
      room.players[0].currentBet = 100; // Dealer calls
      room.currentTurnIndex = 2; // Back to BB
      
      // BB hasn't acted yet (still has just the blind posted)
      const isComplete = BettingRuleEngine.isBettingRoundComplete(room);
      expect(isComplete).toBe(false); // BB should get final action
    });

    test("preflop BB last action rule - raised pot", () => {
      const room = createTestRoom(3);
      
      // Set up blinds and a raise
      room.players[1].currentBet = 50; // Small blind
      room.players[2].currentBet = 100; // Big blind
      room.players[0].currentBet = 200; // Dealer raises
      room.lastAggressorIndex = 0;
      room.pot = 350;
      
      // Turn back to dealer (raiser)
      room.currentTurnIndex = 0;
      
      const isComplete = BettingRuleEngine.isBettingRoundComplete(room);
      expect(isComplete).toBe(true); // Action back to raiser completes round
    });

    test("postflop betting completion", () => {
      const room = createTestRoom(3, "flop");
      room.communityCards = [
        { suit: "hearts", rank: "A" },
        { suit: "spades", rank: "K" }, 
        { suit: "diamonds", rank: "Q" }
      ];
      
      // All players check
      room.firstToActIndex = 1;
      room.currentTurnIndex = 1; // Back to first to act
      room.lastAggressorIndex = -1; // No raises
      
      const isComplete = BettingRuleEngine.isBettingRoundComplete(room);
      expect(isComplete).toBe(true);
    });
  });

  describe("AllInDetectionEngine", () => {
    
    test("should detect when no further betting is possible", () => {
      const room = createTestRoom(3);
      
      // Make all but one player all-in
      room.players[0].chips = 0;
      room.players[1].chips = 0;
      room.players[2].chips = 500; // Only one player with chips
      
      const canBet = AllInDetectionEngine.canFurtherBettingOccur(room);
      expect(canBet).toBe(false);
    });

    test("should detect when betting is still possible", () => {
      const room = createTestRoom(3);
      
      // Two players have chips
      room.players[0].chips = 500;
      room.players[1].chips = 300;
      room.players[2].chips = 0; // One all-in
      
      const canBet = AllInDetectionEngine.canFurtherBettingOccur(room);
      expect(canBet).toBe(true);
    });

    test("should recommend fast-forward when appropriate", () => {
      const room = createTestRoom(2, "flop");
      room.communityCards = [
        { suit: "hearts", rank: "A" },
        { suit: "spades", rank: "K" }, 
        { suit: "diamonds", rank: "Q" }
      ];
      
      // Both players all-in
      room.players[0].chips = 0;
      room.players[1].chips = 0;
      
      const shouldFastForward = AllInDetectionEngine.shouldFastForward(room);
      expect(shouldFastForward).toBe(true);
    });

    test("fast-forward should deal remaining cards", () => {
      const room = createTestRoom(2, "turn");
      room.communityCards = [
        { suit: "hearts", rank: "A" },
        { suit: "spades", rank: "K" }, 
        { suit: "diamonds", rank: "Q" },
        { suit: "clubs", rank: "J" }
      ];
      room.deck = [
        { suit: "hearts", rank: "10" }, // River card
        { suit: "spades", rank: "9" }   // Extra card
      ];
      
      // Both players all-in
      room.players[0].chips = 0;
      room.players[1].chips = 0;
      
      AllInDetectionEngine.fastForwardToShowdown(room);
      
      expect(room.stage).toBe("showdown");
      expect(room.communityCards.length).toBe(5);
      expect(room.communityCards[4]).toEqual({ suit: "hearts", rank: "10" });
    });

    test("all-in situation analysis", () => {
      const room = createTestRoom(4);
      
      // Mixed scenario: 2 all-in, 2 with chips
      room.players[0].chips = 0;
      room.players[1].chips = 0;
      room.players[2].chips = 500;
      room.players[3].chips = 300;
      
      const analysis = AllInDetectionEngine.analyzeAllInSituation(room);
      
      expect(analysis.totalActive).toBe(4);
      expect(analysis.playersWithChips).toBe(2);
      expect(analysis.allInPlayers).toBe(2);
      expect(analysis.canBet).toBe(true);
      expect(analysis.shouldFastForward).toBe(false);
      expect(analysis.needsSidePots).toBe(true);
    });
  });

  describe("TurnOrderManager", () => {
    
    test("heads-up preflop turn order", () => {
      const room = createTestRoom(2);
      room.dealerIndex = 0;
      
      TurnOrderManager.initializeTurnOrder(room);
      
      // Heads-up preflop: button acts first
      expect(room.firstToActIndex).toBe(0);
      expect(room.currentTurnIndex).toBe(0);
      expect(room.players[0].isTurn).toBe(true);
    });

    test("heads-up postflop turn order", () => {
      const room = createTestRoom(2, "flop");
      room.dealerIndex = 0;
      
      TurnOrderManager.initializeTurnOrder(room);
      
      // Heads-up postflop: non-button acts first
      expect(room.firstToActIndex).toBe(1);
      expect(room.currentTurnIndex).toBe(1);
      expect(room.players[1].isTurn).toBe(true);
    });

    test("multi-way preflop turn order", () => {
      const room = createTestRoom(6);
      room.dealerIndex = 0;
      
      TurnOrderManager.initializeTurnOrder(room);
      
      // Multi-way preflop: UTG (left of BB) acts first
      // BB is at position 2, so UTG is position 3
      expect(room.firstToActIndex).toBe(3);
      expect(room.currentTurnIndex).toBe(3);
      expect(room.players[3].isTurn).toBe(true);
    });

    test("advance turn properly", () => {
      const room = createTestRoom(4);
      room.currentTurnIndex = 1;
      room.players[1].isTurn = true;
      room.players[2].hasFolded = true; // Skip folded player
      
      TurnOrderManager.advanceToNextPlayer(room);
      
      expect(room.currentTurnIndex).toBe(3); // Skipped folded player at 2
      expect(room.players[1].isTurn).toBe(false);
      expect(room.players[3].isTurn).toBe(true);
    });

    test("validate turn order consistency", () => {
      const room = createTestRoom(3);
      room.currentTurnIndex = 1;
      room.players[1].isTurn = true;
      
      const isValid = TurnOrderManager.validateTurnOrder(room);
      expect(isValid).toBe(true);
      
      // Create inconsistent state
      room.players[2].isTurn = true; // Multiple players with turn
      
      const isInvalid = TurnOrderManager.validateTurnOrder(room);
      expect(isInvalid).toBe(false);
    });
  });

  describe("GameStateValidator", () => {
    
    test("valid game state passes validation", () => {
      const room = createTestRoom(3);
      room.players[1].currentBet = 50; // SB
      room.players[2].currentBet = 100; // BB
      room.pot = 150;
      room.currentTurnIndex = 0;
      room.players[0].isTurn = true;
      
      const result = GameStateValidator.validateGameRoom(room);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("detects pot mismatch", () => {
      const room = createTestRoom(3);
      room.players[0].currentBet = 100;
      room.players[1].currentBet = 100;
      room.players[2].currentBet = 100;
      room.pot = 250; // Should be 300
      
      const result = GameStateValidator.validateGameRoom(room);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Pot"))).toBe(true);
    });

    test("detects invalid turn state", () => {
      const room = createTestRoom(3);
      room.currentTurnIndex = 1;
      room.players[0].isTurn = true; // Wrong player has turn
      
      const result = GameStateValidator.validateGameRoom(room);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("isTurn"))).toBe(true);
    });

    test("validates stage-specific rules", () => {
      const room = createTestRoom(3, "flop");
      room.communityCards = []; // Flop should have 3 cards
      
      const result = GameStateValidator.validateGameRoom(room);
      
      expect(result.errors.some(e => e.includes("community cards"))).toBe(true);
    });

    test("critical validation identifies severe issues", () => {
      const room = createTestRoom(3);
      room.players[0].chips = -100; // Negative chips
      room.dealerIndex = 10; // Out of bounds
      
      const result = GameStateValidator.validateCritical(room);
      
      expect(result.isValid).toBe(false);
      expect(result.criticalErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Integration Tests", () => {
    
    test("complete preflop betting round with BB option", () => {
      const room = createTestRoom(3);
      
      // Post blinds
      room.players[1].currentBet = 50; // SB
      room.players[2].currentBet = 100; // BB
      room.pot = 150;
      
      // Initialize turn order
      TurnOrderManager.initializeTurnOrder(room);
      expect(room.currentTurnIndex).toBe(0); // UTG
      
      // UTG calls
      room.players[0].currentBet = 100;
      room.pot = 250;
      TurnOrderManager.advanceToNextPlayer(room);
      
      // SB calls
      room.players[1].currentBet = 100;
      room.players[1].chips = 950;
      room.pot = 300;
      TurnOrderManager.advanceToNextPlayer(room);
      
      // Should be BB's turn for final action
      expect(room.currentTurnIndex).toBe(2);
      expect(BettingRuleEngine.isBettingRoundComplete(room)).toBe(false);
      
      // BB checks
      // Round should now be complete
      expect(BettingRuleEngine.isBettingRoundComplete(room)).toBe(true);
    });

    test("all-in scenario triggers fast-forward", () => {
      const room = createTestRoom(2, "preflop");
      room.deck = [
        { suit: "hearts", rank: "2" },
        { suit: "spades", rank: "3" },
        { suit: "diamonds", rank: "4" },
        { suit: "clubs", rank: "5" },
        { suit: "hearts", rank: "6" }
      ];
      
      // Both players go all-in preflop
      room.players[0].chips = 0;
      room.players[0].currentBet = 1000;
      room.players[1].chips = 0;
      room.players[1].currentBet = 1000;
      room.pot = 2000;
      
      // Should trigger fast-forward
      expect(AllInDetectionEngine.shouldFastForward(room)).toBe(true);
      
      // Execute fast-forward
      AllInDetectionEngine.fastForwardToShowdown(room);
      
      // Should be at showdown with 5 community cards
      expect(room.stage).toBe("showdown");
      expect(room.communityCards.length).toBe(5);
      
      // Validate final state
      const validation = GameStateValidator.validateGameRoom(room);
      expect(validation.isValid).toBe(true);
    });

    test("mixed all-in scenario with side pots", () => {
      const room = createTestRoom(3);
      
      // Player 0: all-in for 500
      room.players[0].chips = 0;
      room.players[0].currentBet = 500;
      
      // Player 1: calls 500
      room.players[1].chips = 500;
      room.players[1].currentBet = 500;
      
      // Player 2: raises to 800
      room.players[2].chips = 200;
      room.players[2].currentBet = 800;
      
      room.pot = 1800;
      
      // Analysis should detect side pot situation
      const analysis = AllInDetectionEngine.analyzeAllInSituation(room);
      expect(analysis.needsSidePots).toBe(true);
      expect(analysis.canBet).toBe(true); // Players 1 and 2 can still bet
      expect(analysis.shouldFastForward).toBe(false);
    });
  });

  describe("Error Handling", () => {
    
    test("handles invalid room states gracefully", () => {
      const room = createTestRoom(0); // No players
      
      const validation = GameStateValidator.validateGameRoom(room);
      expect(validation.isValid).toBe(false);
      
      // Should not throw when calling other functions
      expect(() => {
        BettingRuleEngine.isBettingRoundComplete(room);
        AllInDetectionEngine.canFurtherBettingOccur(room);
        TurnOrderManager.validateTurnOrder(room);
      }).not.toThrow();
    });

    test("handles edge cases in turn advancement", () => {
      const room = createTestRoom(3);
      
      // All players folded except one
      room.players[1].hasFolded = true;
      room.players[2].hasFolded = true;
      room.currentTurnIndex = 0;
      
      TurnOrderManager.advanceToNextPlayer(room);
      
      // Should handle gracefully
      expect(room.currentTurnIndex).toBe(-1); // No valid next player
    });
  });
});