import { describe, it, expect } from "vitest";
import { PokerStateMachine, GameState, BettingRound } from "../stateMachine";

describe("PokerStateMachine", () => {
  it("follows the hand lifecycle and pause/resume", () => {
    const sm = new PokerStateMachine();
    expect(sm.state).toBe(GameState.WaitingForPlayers);

    sm.dispatch({ type: "PLAYERS_READY" });
    expect(sm.state).toBe(GameState.Shuffling);

    sm.dispatch({ type: "SHUFFLE_COMPLETE" });
    expect(sm.state).toBe(GameState.Dealing);

    sm.dispatch({ type: "DEAL_COMPLETE" });
    expect(sm.state).toBe(GameState.Betting);
    expect(sm.round).toBe(BettingRound.PreFlop);

    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(GameState.Dealing);

    sm.dispatch({ type: "DEAL_COMPLETE" });
    expect(sm.state).toBe(GameState.Betting);
    expect(sm.round).toBe(BettingRound.Flop);

    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(GameState.Dealing);

    sm.dispatch({ type: "DEAL_COMPLETE" });
    expect(sm.state).toBe(GameState.Betting);
    expect(sm.round).toBe(BettingRound.Turn);

    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(GameState.Dealing);

    sm.dispatch({ type: "DEAL_COMPLETE" });
    expect(sm.state).toBe(GameState.Betting);
    expect(sm.round).toBe(BettingRound.River);

    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(GameState.Showdown);

    sm.dispatch({ type: "SHOWDOWN_COMPLETE" });
    expect(sm.state).toBe(GameState.Payout);

    sm.dispatch({ type: "PAYOUT_COMPLETE" });
    expect(sm.state).toBe(GameState.WaitingForPlayers);

    sm.dispatch({ type: "PLAYERS_READY" });
    sm.dispatch({ type: "PAUSE", reason: "maintenance" });
    expect(sm.state).toBe(GameState.Paused);
    sm.dispatch({ type: "RESUME" });
    expect(sm.state).toBe(GameState.Shuffling);
  });
});
