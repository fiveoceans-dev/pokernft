import { describe, it, expect } from "vitest";
import {
  Table,
  Player,
  PlayerState,
  PlayerAction,
  TableState,
  Round,
} from "../types";
import { dealHole } from "../dealer";
import { assignBlindsAndButton, advanceButton } from "../blindManager";
import {
  startBettingRound,
  applyAction,
  isBettingRoundComplete,
} from "../bettingEngine";

const card = (rank: string, suit: string) => ({
  rank: rank as any,
  suit: suit as any,
});
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

describe("Dealer & BettingEngine", () => {
  it("deals hole cards starting from small blind", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 0),
        createPlayer("b", 1, 0),
        createPlayer("c", 2, 0),
      ],
      buttonIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      smallBlindAmount: 5,
      bigBlindAmount: 10,
      minBuyIn: 0,
      maxBuyIn: 0,
      state: TableState.DEALING_HOLE,
      deck: [
        card("6", "s"),
        card("5", "s"),
        card("4", "s"),
        card("3", "s"),
        card("2", "s"),
        card("1", "s"),
      ],
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
    dealHole(table);
    expect(table.seats[1]?.holeCards).toEqual([card("1", "s"), card("4", "s")]);
    expect(table.seats[2]?.holeCards).toEqual([card("2", "s"), card("5", "s")]);
    expect(table.seats[0]?.holeCards).toEqual([card("3", "s"), card("6", "s")]);
  });

  it("enforces min-raise and round completion", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 40),
        createPlayer("b", 1, 100),
        createPlayer("c", 2, 20),
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
    startBettingRound(table, Round.PREFLOP);
    expect(table.betToCall).toBe(10);
    expect(table.actingIndex).toBe(1);
    applyAction(table, 1, { type: PlayerAction.RAISE, amount: 20 }); // raise to 30
    expect(table.betToCall).toBe(30);
    expect(table.minRaise).toBe(20);
    applyAction(table, 2, { type: PlayerAction.FOLD });
    applyAction(table, 0, { type: PlayerAction.ALL_IN }); // to 40 total, raise 10 (<minRaise)
    expect(table.betToCall).toBe(40);
    expect(table.minRaise).toBe(20);
    applyAction(table, 1, { type: PlayerAction.CALL });
    expect(isBettingRoundComplete(table)).toBe(true);
    expect(table.actingIndex).toBeNull();
  });

  it("prevents re-raising after a short all-in", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 100),
        createPlayer("b", 1, 35),
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

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    startBettingRound(table, Round.PREFLOP);

    applyAction(table, 0, { type: PlayerAction.RAISE, amount: 20 }); // to 30
    applyAction(table, 1, { type: PlayerAction.ALL_IN }); // to 35 total, short raise
    applyAction(table, 2, { type: PlayerAction.FOLD });

    expect(() =>
      applyAction(table, 0, { type: PlayerAction.RAISE, amount: 20 }),
    ).toThrow();

    applyAction(table, 0, { type: PlayerAction.CALL });
    expect(isBettingRoundComplete(table)).toBe(true);
  });

  it("blocks earlier callers from re-raising after short all-in", () => {
    const table: Table = {
      seats: [
        createPlayer("a", 0, 100),
        createPlayer("b", 1, 100),
        createPlayer("c", 2, 35),
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

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    startBettingRound(table, Round.PREFLOP);

    applyAction(table, 0, { type: PlayerAction.RAISE, amount: 20 }); // to 30
    applyAction(table, 1, { type: PlayerAction.CALL });
    applyAction(table, 2, { type: PlayerAction.ALL_IN }); // to 35 total, short raise
    applyAction(table, 0, { type: PlayerAction.CALL });
    expect(() =>
      applyAction(table, 1, { type: PlayerAction.RAISE, amount: 20 }),
    ).toThrow();
    applyAction(table, 1, { type: PlayerAction.CALL });
    expect(isBettingRoundComplete(table)).toBe(true);
  });

  it("rejects invalid checks without changing turn", () => {
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
      dealAnimationDelayMs: 0,
    };

    const ok = assignBlindsAndButton(table);
    expect(ok).toBe(true);
    startBettingRound(table, Round.PREFLOP);
    const actor = table.actingIndex!;
    expect(() =>
      applyAction(table, actor, { type: PlayerAction.CHECK }),
    ).toThrow();
    expect(table.actingIndex).toBe(actor);
  });
});
