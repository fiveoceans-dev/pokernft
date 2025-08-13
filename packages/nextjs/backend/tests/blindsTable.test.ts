import { describe, it, expect } from "vitest";
import {
  assignBlindsAndButton,
  advanceButton,
  resolveMissedBlinds,
} from "../blindManager";
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
  missedSmallBlind: false,
  missedBigBlind: false,
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
      deadBlindRule: 'POST',
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
      deadBlindRule: 'POST',
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
      deadBlindRule: 'POST',
    };

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.smallBlindIndex).toBe(0);
    expect(table.bigBlindIndex).toBe(1);
    expect(table.seats[2]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.actingIndex).toBe(0);
  });
});

describe("button rotation and dead blinds", () => {
  it("advances button to next active seat", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 100),
        null,
        createPlayer("c", 2, 100),
      ],
      buttonIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 2,
      smallBlindAmount: 5,
      bigBlindAmount: 10,
      minBuyIn: 0,
      maxBuyIn: 0,
      state: TableState.PAYOUT,
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
      deadBlindRule: 'POST',
    };
    advanceButton(table);
    expect(table.buttonIndex).toBe(2);
    expect(table.seats[2]?.hasButton).toBe(true);
  });

  it("settles missed blinds when player returns", () => {
    const table: Table = {
      seats: [createPlayer("a", 0, 100)],
      buttonIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 0,
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
      deadBlindRule: 'POST',
    };
    const player = table.seats[0]!;
    player.state = PlayerState.SITTING_OUT;
    player.missedBigBlind = true;
    resolveMissedBlinds(table, 0);
    expect(player.state).toBe(PlayerState.ACTIVE);
    expect(player.stack).toBe(90);
  });
});
