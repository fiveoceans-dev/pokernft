import { describe, it, expect } from "vitest";
import { GameEngine } from "../gameEngine";

describe("GameEngine", () => {
  it("advances through stages and resets for a new hand", () => {
    const engine = new GameEngine("t1", 10);
    engine.addPlayer({ id: "a", nickname: "A", seat: 0, chips: 100 });
    engine.addPlayer({ id: "b", nickname: "B", seat: 1, chips: 100 });

    engine.startHand();
    expect(engine.getState().stage).toBe("preflop");

    engine.progressStage();
    expect(engine.getState().stage).toBe("flop");
    engine.progressStage();
    expect(engine.getState().stage).toBe("turn");
    engine.progressStage();
    expect(engine.getState().stage).toBe("river");
    engine.progressStage();
    expect(engine.getState().stage).toBe("showdown");

    const winners = engine.determineWinners();
    engine.payout(winners);

    engine.startHand();
    expect(engine.getState().stage).toBe("preflop");
  });

  it("clears player hand on fold", () => {
    const engine = new GameEngine("t2", 10);
    engine.addPlayer({ id: "a", nickname: "A", seat: 0, chips: 100 });
    engine.addPlayer({ id: "b", nickname: "B", seat: 1, chips: 100 });

    engine.startHand();
    const room = engine.getState();
    const foldingId = room.players[room.currentTurnIndex].id;
    expect(room.players.find((p) => p.id === foldingId)?.hand.length).toBe(2);
    engine.handleAction(foldingId, { type: "fold" });
    expect(
      engine.getState().players.find((p) => p.id === foldingId)?.hand.length,
    ).toBe(0);
  });

  it("allows betting round on the river before showdown", () => {
    const engine = new GameEngine("t3", 10);
    engine.addPlayer({ id: "a", nickname: "A", seat: 0, chips: 100 });
    engine.addPlayer({ id: "b", nickname: "B", seat: 1, chips: 100 });

    engine.startHand();
    // advance directly to river
    engine.progressStage(); // flop
    engine.progressStage(); // turn
    engine.progressStage(); // river
    expect(engine.getState().stage).toBe("river");

    const first =
      engine.getState().players[engine.getState().currentTurnIndex].id;
    engine.handleAction(first, { type: "check" });
    expect(engine.getState().stage).toBe("river");

    const second =
      engine.getState().players[engine.getState().currentTurnIndex].id;
    engine.handleAction(second, { type: "check" });
    expect(engine.getState().stage).toBe("showdown");
  });
});
