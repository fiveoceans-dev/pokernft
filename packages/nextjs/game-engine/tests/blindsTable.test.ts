import { describe, it, expect } from "vitest";
import { assignBlindsAndButton, advanceButton } from "../blindManager";
import {
  Player,
  PlayerAction,
  PlayerState,
  Table,
  TableState,
  Round,
  DeadBlindRule,
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    advanceButton(table);
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    advanceButton(table);
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.smallBlindIndex).toBe(0);
    expect(table.bigBlindIndex).toBe(1);
    expect(table.seats[2]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.actingIndex).toBe(0);
  });

  it("advances the button to the next active seat", () => {
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
      deadBlindRule: DeadBlindRule.POST,
    };
    table.seats[1]!.state = PlayerState.SITTING_OUT;
    advanceButton(table);
    expect(table.buttonIndex).toBe(2);
  });

  it("skips returning player with missed blind when waiting", () => {
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
      deadBlindRule: DeadBlindRule.WAIT,
    };
    table.seats[1]!.missedBigBlind = true;
    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.smallBlindIndex).toBe(2);
    expect(table.bigBlindIndex).toBe(0);
    expect(table.seats[1]?.missedSmallBlind).toBe(true);
  });

  it("collects missed blinds when posting", () => {
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
      deadBlindRule: DeadBlindRule.POST,
    };
    table.seats[2]!.missedBigBlind = true;
    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.smallBlindIndex).toBe(1);
    expect(table.bigBlindIndex).toBe(2);
    expect(table.seats[2]?.stack).toBe(80);
    expect(table.seats[2]?.betThisRound).toBe(20);
    expect(table.seats[2]?.missedBigBlind).toBe(false);
  });

  it("allows short stacks to post all-in blinds", () => {
    const table: Table = {
      seats: [createPlayer("a", 0, 3), createPlayer("b", 1, 6)],
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

    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.seats[0]?.state).toBe(PlayerState.ALL_IN);
    expect(table.seats[0]?.betThisRound).toBe(3);
    expect(table.seats[1]?.state).toBe(PlayerState.ALL_IN);
    expect(table.seats[1]?.betThisRound).toBe(6);
  });

  it("marks players sitting out when they decline to auto-post", () => {
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
      lastFullRaise: null,
      actedSinceLastRaise: new Set(),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };
    table.seats[2]!.autoPostBlinds = false;
    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    expect(table.seats[2]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.seats[2]?.missedSmallBlind).toBe(true);
    expect(table.smallBlindIndex).toBe(1);
    expect(table.bigBlindIndex).toBe(0);
    expect(table.actingIndex).toBe(1);
  });

  it("returns false when only one player can post a blind", () => {
    const table: Table = {
      seats: [createPlayer("a", 0, 100), createPlayer("b", 1, 0)],
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
    table.seats[0]!.autoPostBlinds = false;
    advanceButton(table);
    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(false);
    expect(table.seats[0]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.seats[0]?.missedSmallBlind).toBe(true);
  });
});
