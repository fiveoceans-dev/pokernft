import { describe, it, expect } from "vitest";
import { assignBlindsAndButton } from "../blindManager";
import { startBettingRound } from "../bettingEngine";
import {
  Player,
  PlayerAction,
  PlayerState,
  Table,
  TableState,
  Round,
} from "../types";

const createPlayer = (
  id: string,
  seatIndex: number,
  stack: number,
): Player => ({
  id,
  seatIndex,
  stack,
  state: PlayerState.ACTIVE,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: 0,
  holeCards: [],
  lastAction: PlayerAction.NONE,
});

describe("startBettingRound", () => {
  it("sets heads-up acting order correctly", () => {
    const table: Table = {
      seats: [createPlayer("a", 0, 100), createPlayer("b", 1, 100)],
      buttonIndex: 1,
      smallBlindIndex: -1,
      bigBlindIndex: -1,
      smallBlindAmount: 5,
      bigBlindAmount: 10,
      minBuyIn: 0,
      maxBuyIn: 0,
      state: TableState.BLINDS,
      deck: [],
      board: [],
      pots: [],
      currentRound: Round.PREFLOP,
      actingIndex: null,
      betToCall: 0,
      minRaise: 0,
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    assignBlindsAndButton(table);
    startBettingRound(table, Round.PREFLOP);
    expect(table.actingIndex).toBe(table.smallBlindIndex);

    table.seats.forEach((p) => {
      if (p) p.betThisRound = 0;
    });
    startBettingRound(table, Round.FLOP);
    expect(table.actingIndex).toBe(table.bigBlindIndex);
  });
});
