import { describe, it, expect } from "vitest";
import { playerStateReducer } from "../playerStateMachine";
import { PlayerState, TableState } from "../types";
import { TableStateMachine } from "../tableStateMachine";

describe("playerStateReducer", () => {
  it("activates player with sufficient stack", () => {
    const state = playerStateReducer(PlayerState.SEATED, {
      type: "NEW_HAND",
      stack: 50,
      bigBlind: 10,
      sittingOut: false,
    });
    expect(state).toBe(PlayerState.ACTIVE);
  });

  it("sits player out when stack below minToPlay", () => {
    const state = playerStateReducer(PlayerState.SEATED, {
      type: "NEW_HAND",
      stack: 5,
      bigBlind: 10,
      sittingOut: false,
    });
    expect(state).toBe(PlayerState.SITTING_OUT);
  });

  it("allows short-buy when minToPlay lower than big blind", () => {
    const state = playerStateReducer(PlayerState.SEATED, {
      type: "NEW_HAND",
      stack: 5,
      bigBlind: 10,
      minToPlay: 5,
      sittingOut: false,
    });
    expect(state).toBe(PlayerState.ACTIVE);
  });

  it("sits player out when toggled", () => {
    const state = playerStateReducer(PlayerState.SEATED, {
      type: "NEW_HAND",
      stack: 50,
      bigBlind: 10,
      sittingOut: true,
    });
    expect(state).toBe(PlayerState.SITTING_OUT);
  });

  it("folds player on fold action", () => {
    const state = playerStateReducer(PlayerState.ACTIVE, { type: "FOLD" });
    expect(state).toBe(PlayerState.FOLDED);
  });

  it("auto folds disconnected player on timeout", () => {
    const state = playerStateReducer(PlayerState.DISCONNECTED, {
      type: "FOLD",
    });
    expect(state).toBe(PlayerState.FOLDED);
  });

  it("marks player sitting out when broke and rebuy allowed", () => {
    const state = playerStateReducer(PlayerState.ACTIVE, {
      type: "HAND_END",
      stack: 0,
      reBuyAllowed: true,
    });
    expect(state).toBe(PlayerState.SITTING_OUT);
  });

  it("marks player leaving when broke and rebuy disallowed", () => {
    const state = playerStateReducer(PlayerState.ACTIVE, {
      type: "HAND_END",
      stack: 0,
      reBuyAllowed: false,
    });
    expect(state).toBe(PlayerState.LEAVING);
  });

  it("removes player who chose to leave", () => {
    const state = playerStateReducer(PlayerState.LEAVING, {
      type: "HAND_END",
      stack: 50,
      reBuyAllowed: true,
    });
    expect(state).toBe(PlayerState.EMPTY);
  });
});

describe("TableStateMachine", () => {
  it("progresses through a full hand", () => {
    const sm = new TableStateMachine();
    sm.dispatch({ type: "START_HAND", activeSeats: 2 });
    expect(sm.state).toBe(TableState.BLINDS);
    sm.dispatch({ type: "BLINDS_POSTED" });
    expect(sm.state).toBe(TableState.DEALING_HOLE);
    sm.dispatch({ type: "DEALING_COMPLETE" });
    expect(sm.state).toBe(TableState.PRE_FLOP);
    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.FLOP);
    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.TURN);
    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.RIVER);
    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.SHOWDOWN);
    sm.dispatch({ type: "SHOWDOWN_COMPLETE" });
    expect(sm.state).toBe(TableState.PAYOUT);
    sm.dispatch({ type: "PAYOUT_COMPLETE" });
    expect(sm.state).toBe(TableState.ROTATE);
    sm.dispatch({ type: "ROTATION_COMPLETE" });
    expect(sm.state).toBe(TableState.CLEANUP);
    sm.dispatch({ type: "CLEANUP_COMPLETE", activeSeats: 2 });
    expect(sm.state).toBe(TableState.BLINDS);
  });

  it("returns to waiting when fewer than two players remain", () => {
    const sm = new TableStateMachine();
    sm.dispatch({ type: "START_HAND", activeSeats: 2 });
    sm.dispatch({ type: "BLINDS_POSTED" });
    sm.dispatch({ type: "DEALING_COMPLETE" });
    sm.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: 1 });
    expect(sm.state).toBe(TableState.PAYOUT);
    sm.dispatch({ type: "PAYOUT_COMPLETE" });
    sm.dispatch({ type: "ROTATION_COMPLETE" });
    sm.dispatch({ type: "CLEANUP_COMPLETE", activeSeats: 1 });
    expect(sm.state).toBe(TableState.WAITING);
  });
});
