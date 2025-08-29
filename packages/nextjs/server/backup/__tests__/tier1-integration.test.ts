import { GameRoom, PlayerSession } from "../core/types";
import { GameController } from "../data-structures/GameController";
import { BettingState } from "../data-structures/BettingRoundState";

/**
 * Integration tests for Tier 1 data structures
 * Tests the core functionality that was broken before
 */
describe("Tier 1 Data Structures Integration", () => {

  /**
   * Create a test room with specified players
   */
  function createTestRoom(playerCount: number = 3): GameRoom {
    const room: GameRoom = {
      id: "test-tier1",
      players: [],
      dealerIndex: 0,
      currentTurnIndex: 0,
      firstToActIndex: 0,
      lastAggressorIndex: -1,
      stage: "preflop",
      pot: 0,
      communityCards: [],
      minBet: 100,
      smallBlindAmount: 50,
      bigBlindAmount: 100,
      deck: [
        { suit: "h", rank: "A" }, { suit: "s", rank: "K" }, { suit: "d", rank: "Q" },
        { suit: "c", rank: "J" }, { suit: "h", rank: "T" }, { suit: "s", rank: "9" },
        { suit: "d", rank: "8" }, { suit: "c", rank: "7" }, { suit: "h", rank: "6" },
        { suit: "s", rank: "5" }, { suit: "d", rank: "4" }, { suit: "c", rank: "3" }
      ],
      actionHistory: []
    };

    // Add players
    for (let i = 0; i < playerCount; i++) {
      const player: PlayerSession = {
        id: `player-${i}`,
        nickname: `Player ${i}`,
        seat: i,
        chips: 1000,
        tableId: "test-tier1",
        isDealer: i === 0,
        isTurn: false,
        hand: [{ suit: "h", rank: "A" }, { suit: "s", rank: "K" }],
        hasFolded: false,
        currentBet: 0
      };
      room.players.push(player);
    }

    return room;
  }

  describe("Multi-way Preflop BB Option (The Original Bug)", () => {
    
    test("3-player preflop: BB gets option in unopened pot", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      // Start hand - blinds should be posted automatically
      controller.startNewHand();
      
      console.log("After hand start:");
      console.log(`SB: ${room.players[1].currentBet}, BB: ${room.players[2].currentBet}`);
      console.log(`Current turn: ${room.currentTurnIndex} (${room.players[room.currentTurnIndex].id})`);
      
      // Should be UTG's turn (player 0 in 3-handed)
      expect(room.currentTurnIndex).toBe(0); // UTG acts first
      expect(room.players[0].isTurn).toBe(true);
      
      // UTG calls
      const utgResult = controller.processAction("player-0", "call");
      expect(utgResult.success).toBe(true);
      expect(utgResult.roundComplete).toBe(false);
      
      // Should advance to dealer (player 1 in 3-handed is actually SB)
      expect(room.currentTurnIndex).toBe(1);
      
      // SB calls
      const sbResult = controller.processAction("player-1", "call");  
      expect(sbResult.success).toBe(true);
      expect(sbResult.roundComplete).toBe(false);
      
      // Should advance to BB
      expect(room.currentTurnIndex).toBe(2);
      expect(room.players[2].isTurn).toBe(true);
      
      // Betting should NOT be complete - BB needs option
      expect(controller.isBettingRoundComplete()).toBe(false);
      expect(controller.getBettingState()).toBe(BettingState.AWAITING_ACTION);
      
      console.log("Before BB acts:");
      console.log("Betting state:", controller.getBettingState());
      console.log("Current turn:", room.currentTurnIndex, room.players[room.currentTurnIndex].id);
      
      // BB should have option to check or raise
      const validActions = controller.getValidActions("player-2");
      expect(validActions).toContain("check");
      expect(validActions).toContain("raise");
      expect(validActions).not.toContain("call"); // No need to call in unopened pot
    });

    test("3-player preflop: BB checks, round completes", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Everyone calls to BB
      controller.processAction("player-0", "call"); // UTG
      controller.processAction("player-1", "call"); // SB  
      
      // BB checks (exercises option)
      const bbResult = controller.processAction("player-2", "check");
      expect(bbResult.success).toBe(true);
      expect(bbResult.roundComplete).toBe(true);
      
      // Betting should now be complete
      expect(controller.isBettingRoundComplete()).toBe(true);
      expect(controller.getBettingState()).toBe(BettingState.COMPLETE);
    });

    test("3-player preflop: BB raises, UTG gets action back", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Everyone calls to BB
      controller.processAction("player-0", "call"); // UTG
      controller.processAction("player-1", "call"); // SB
      
      // BB raises
      const bbResult = controller.processAction("player-2", "raise", 200);
      expect(bbResult.success).toBe(true);
      expect(bbResult.roundComplete).toBe(false);
      
      // Should be back to UTG (first to act)
      expect(room.currentTurnIndex).toBe(0);
      expect(room.players[0].isTurn).toBe(true);
      
      // Betting should be active (not complete)
      expect(controller.isBettingRoundComplete()).toBe(false);
      expect(controller.getBettingState()).toBe(BettingState.BETTING);
    });
  });

  describe("Heads-up Preflop", () => {
    
    test("Heads-up: SB calls, BB gets option", () => {
      const room = createTestRoom(2);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Should be SB's turn (dealer in heads-up)
      expect(room.currentTurnIndex).toBe(0);
      
      // SB calls
      const sbResult = controller.processAction("player-0", "call");
      expect(sbResult.success).toBe(true);
      expect(sbResult.roundComplete).toBe(false);
      
      // Should advance to BB
      expect(room.currentTurnIndex).toBe(1);
      expect(room.players[1].isTurn).toBe(true);
      
      // BB should have option
      expect(controller.isBettingRoundComplete()).toBe(false);
      const validActions = controller.getValidActions("player-1");
      expect(validActions).toContain("check");
      expect(validActions).toContain("raise");
    });
  });

  describe("Postflop Turn Order", () => {
    
    test("Postflop: proper turn order, all players get action", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      // Complete preflop
      controller.startNewHand();
      controller.processAction("player-0", "call");
      controller.processAction("player-1", "call");
      controller.processAction("player-2", "check");
      
      // Progress to flop
      controller.progressStage();
      expect(room.stage).toBe("flop");
      
      // Should be SB's turn first postflop
      expect(room.currentTurnIndex).toBe(1); // SB
      expect(room.players[1].isTurn).toBe(true);
      
      // SB checks
      const sbResult = controller.processAction("player-1", "check");
      expect(sbResult.success).toBe(true);
      expect(sbResult.roundComplete).toBe(false);
      
      // Should advance to BB
      expect(room.currentTurnIndex).toBe(2);
      
      // BB checks  
      controller.processAction("player-2", "check");
      expect(room.currentTurnIndex).toBe(0); // Should advance to UTG
      
      // UTG checks - round should complete
      const utgResult = controller.processAction("player-0", "check");
      expect(utgResult.success).toBe(true);
      expect(utgResult.roundComplete).toBe(true);
    });
  });

  describe("All-in and Showdown Scenarios", () => {
    
    test("All players all-in: betting blocked", () => {
      const room = createTestRoom(2);
      const controller = new GameController(room);
      
      // Set both players to small chip counts
      room.players[0].chips = 100;
      room.players[1].chips = 100;
      
      controller.startNewHand();
      
      // Both go all-in
      controller.processAction("player-0", "raise", 50); // SB all-in
      controller.processAction("player-1", "call"); // BB all-in
      
      // Betting should be blocked (both all-in)
      expect(controller.getBettingState()).toBe(BettingState.BLOCKED);
      expect(controller.isBettingRoundComplete()).toBe(true);
      
      // No player should be able to act
      expect(controller.canAnyPlayerAct()).toBe(false);
    });

    test("Showdown stage: no actions allowed", () => {
      const room = createTestRoom(2);
      room.stage = "showdown";
      const controller = new GameController(room);
      
      // Should be blocked in showdown
      expect(controller.getBettingState()).toBe(BettingState.BLOCKED);
      expect(controller.canAnyPlayerAct()).toBe(false);
      
      // No valid actions for any player
      expect(controller.getValidActions("player-0")).toHaveLength(0);
      expect(controller.getValidActions("player-1")).toHaveLength(0);
    });
  });

  describe("Action Validation", () => {
    
    test("Invalid actions are rejected", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Wrong player tries to act
      const wrongPlayerResult = controller.processAction("player-1", "check");
      expect(wrongPlayerResult.success).toBe(false);
      expect(wrongPlayerResult.error).toContain("turn");
      
      // Current player tries invalid action
      const invalidActionResult = controller.processAction("player-0", "check");
      expect(invalidActionResult.success).toBe(false);
      expect(invalidActionResult.error).toContain("call"); // Should call, not check
      
      // Valid action works
      const validResult = controller.processAction("player-0", "call");
      expect(validResult.success).toBe(true);
    });
    
    test("Raise amounts are validated", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Too small raise
      const smallRaiseResult = controller.processAction("player-0", "raise", 10);
      expect(smallRaiseResult.success).toBe(false);
      expect(smallRaiseResult.error).toContain("minimum");
      
      // Valid raise
      const validRaiseResult = controller.processAction("player-0", "raise", 200);
      expect(validRaiseResult.success).toBe(true);
    });
  });

  describe("State Consistency", () => {
    
    test("All structures remain valid throughout game", () => {
      const room = createTestRoom(4);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      // Validate initial state
      expect(controller.validateState()).toBe(true);
      
      // Play through preflop
      controller.processAction("player-1", "call"); // UTG+1
      expect(controller.validateState()).toBe(true);
      
      controller.processAction("player-2", "raise", 200); // CO raises
      expect(controller.validateState()).toBe(true);
      
      controller.processAction("player-3", "fold"); // BTN folds
      expect(controller.validateState()).toBe(true);
      
      controller.processAction("player-0", "call"); // SB calls raise
      expect(controller.validateState()).toBe(true);
      
      controller.processAction("player-1", "call"); // UTG+1 calls raise
      expect(controller.validateState()).toBe(true);
    });
  });

  describe("Debug Information", () => {
    
    test("Debug info provides comprehensive state", () => {
      const room = createTestRoom(3);
      const controller = new GameController(room);
      
      controller.startNewHand();
      
      const debugInfo = controller.getDebugInfo();
      
      // Should have all major components
      expect(debugInfo).toHaveProperty('room');
      expect(debugInfo).toHaveProperty('turnOrder');
      expect(debugInfo).toHaveProperty('bettingState');
      expect(debugInfo).toHaveProperty('positions');
      expect(debugInfo).toHaveProperty('gameState');
      
      // Room info should be accurate
      expect((debugInfo as any).room.stage).toBe('preflop');
      expect((debugInfo as any).room.activePlayers).toBe(3);
      expect((debugInfo as any).room.pot).toBe(150); // SB + BB
    });
  });
});