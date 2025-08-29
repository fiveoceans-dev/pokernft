import { GameRoom, PlayerSession } from "../core/types";
import { GameController } from "../data-structures/GameController";

/**
 * Test that BB can raise when they have the option in unopened pot
 */
describe("BB Option Raise", () => {
  
  function createTestRoom(): GameRoom {
    const room: GameRoom = {
      id: "test-bb-raise",
      players: [],
      dealerIndex: 0,
      currentTurnIndex: 0,
      firstToActIndex: 0,
      lastAggressorIndex: -1,
      pot: 0,
      communityCards: [],
      deck: [],
      stage: "waiting",
      minBet: 10,
      smallBlindAmount: 5,
      bigBlindAmount: 10,
      actionHistory: []
    };

    // Add 3 players
    const players: PlayerSession[] = [
      {
        id: "dealer",
        nickname: "Dealer",
        tableId: room.id,
        seat: 0,
        chips: 1000,
        isDealer: true,
        isTurn: false,
        hand: [],
        hasFolded: false,
        currentBet: 0
      },
      {
        id: "sb",
        nickname: "Small Blind",
        tableId: room.id,
        seat: 1,
        chips: 1000,
        isDealer: false,
        isTurn: false,
        hand: [],
        hasFolded: false,
        currentBet: 0
      },
      {
        id: "bb",
        nickname: "Big Blind",
        tableId: room.id,
        seat: 2,
        chips: 1000,
        isDealer: false,
        isTurn: false,
        hand: [],
        hasFolded: false,
        currentBet: 0
      }
    ];

    room.players = players;
    return room;
  }

  it("should allow BB to raise when everyone calls in preflop", () => {
    const room = createTestRoom();
    const controller = new GameController(room);
    
    // Start new hand - posts blinds and sets up turn order
    controller.startNewHand();
    
    // Verify BB posted blind
    expect(room.players[2].currentBet).toBe(10); // BB
    expect(room.players[1].currentBet).toBe(5);  // SB
    expect(room.pot).toBe(15);

    // Get valid actions for first player (should be dealer/button)
    expect(room.currentTurnIndex).toBe(0); // Dealer acts first in 3-way preflop
    let validActions = controller.getValidActions("dealer");
    expect(validActions).toContain("fold");
    expect(validActions).toContain("call");
    expect(validActions).toContain("raise");

    // Dealer calls BB
    let result = controller.processAction("dealer", "call", 10);
    expect(result.success).toBe(true);
    expect(room.players[0].currentBet).toBe(10);
    expect(room.pot).toBe(25);

    // SB calls (completes to BB)
    validActions = controller.getValidActions("sb");
    expect(validActions).toContain("fold");
    expect(validActions).toContain("call");
    expect(validActions).toContain("raise");
    
    result = controller.processAction("sb", "call", 5); // SB needs 5 more to match BB
    expect(result.success).toBe(true);
    expect(room.players[1].currentBet).toBe(10);
    expect(room.pot).toBe(30);

    // Now it's BB's turn with option
    expect(room.currentTurnIndex).toBe(2); // BB
    validActions = controller.getValidActions("bb");
    
    // BB should be able to check or raise (this is the fix!)
    expect(validActions).toContain("check");
    expect(validActions).toContain("raise");
    expect(validActions).toContain("fold"); // Can always fold
    expect(validActions).not.toContain("call"); // No need to call, already matched
    
    // Get action requirements to verify raise amount
    const requirements = controller.getActionRequirements("bb");
    expect(requirements).not.toBeNull();
    expect(requirements!.canRaise).toBe(true);
    expect(requirements!.minRaise).toBe(10); // Min raise should be one BB
    expect(requirements!.betToCall).toBe(0); // BB doesn't owe anything
    
    // BB raises by 20 (to 30 total)
    result = controller.processAction("bb", "raise", 20);
    expect(result.success).toBe(true);
    expect(room.players[2].currentBet).toBe(30); // BB now at 30
    expect(room.players[2].chips).toBe(980); // Started with 1000, posted 10, raised 20
    expect(room.pot).toBe(50); // 30 initial + 20 raise
    
    // Now others need to match the raise
    expect(room.currentTurnIndex).toBe(0); // Back to dealer
    validActions = controller.getValidActions("dealer");
    expect(validActions).toContain("fold");
    expect(validActions).toContain("call");
    expect(validActions).toContain("raise");
  });

  it("should allow BB to check with option to end betting round", () => {
    const room = createTestRoom();
    const controller = new GameController(room);
    
    // Start new hand
    controller.startNewHand();
    
    // Dealer calls
    controller.processAction("dealer", "call", 10);
    
    // SB calls
    controller.processAction("sb", "call", 5);
    
    // BB checks (exercises option without raising)
    const result = controller.processAction("bb", "check");
    expect(result.success).toBe(true);
    expect(result.roundComplete).toBe(true); // Round should end
    
    // Should progress to flop
    controller.progressStage();
    expect(room.stage).toBe("flop");
  });

  it("should not give BB option if someone raised", () => {
    const room = createTestRoom();
    const controller = new GameController(room);
    
    // Start new hand
    controller.startNewHand();
    
    // Dealer raises to 30
    controller.processAction("dealer", "raise", 30);
    expect(room.players[0].currentBet).toBe(30);
    
    // SB folds
    controller.processAction("sb", "fold");
    
    // BB should need to call or fold, not have option to just check
    const validActions = controller.getValidActions("bb");
    expect(validActions).toContain("fold");
    expect(validActions).toContain("call");
    expect(validActions).toContain("raise");
    expect(validActions).not.toContain("check"); // Can't check, must match raise
    
    const requirements = controller.getActionRequirements("bb");
    expect(requirements!.betToCall).toBe(20); // BB needs 20 more to match 30
  });
});