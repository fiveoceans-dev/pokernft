import { describe, it, expect } from "vitest";
import { assignBlindsAndButton } from "../blindManager";
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

describe("assignBlindsAndButton", () => {
  it("posts blinds and sets turn order for 3 players", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 100),
        createPlayer("b", 1, 100),
        createPlayer("c", 2, 100),
      ],
      buttonIndex: 0,
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
      actionTimer: 0,
      interRoundDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.buttonIndex).toBe(1);
    expect(table.smallBlindIndex).toBe(2);
    expect(table.bigBlindIndex).toBe(0);
    expect(table.seats[2]?.betThisRound).toBe(5);
    expect(table.seats[0]?.betThisRound).toBe(10);
    expect(table.actingIndex).toBe(1);
  });

  it("handles heads-up blinds and turn order", () => {
    const table: Table = {
      seats: [createPlayer("a", 0, 50), createPlayer("b", 1, 50)],
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
      actionTimer: 0,
      interRoundDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.buttonIndex).toBe(0);
    expect(table.smallBlindIndex).toBe(0);
    expect(table.bigBlindIndex).toBe(1);
    expect(table.actingIndex).toBe(0);
  });

  it("recomputes blinds if SB cannot post", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 100),
        createPlayer("b", 1, 100),
        createPlayer("c", 2, 0),
      ],
      buttonIndex: 0,
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
      actionTimer: 0,
      interRoundDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.smallBlindIndex).toBe(0);
    expect(table.bigBlindIndex).toBe(1);
    expect(table.seats[2]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.actingIndex).toBe(0);
  });
});
