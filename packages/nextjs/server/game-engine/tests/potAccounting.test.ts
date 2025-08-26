import { describe, it, expect } from "vitest";
import {
  Table,
  Player,
  PlayerState,
  PlayerAction,
  TableState,
  Round,
} from "../types";
import { rebuildPots, applyRake, resetForNextRound } from "../potManager";

const createPlayer = (
  id: string,
  seatIndex: number,
  committed: number,
  state: PlayerState = PlayerState.ACTIVE,
): Player => ({
  id,
  seatIndex,
  stack: 0,
  state,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: committed,
  holeCards: [],
  lastAction: PlayerAction.NONE,
});

const createTable = (players: Player[], extra: Partial<Table> = {}): Table => ({
  seats: players,
  buttonIndex: 0,
  smallBlindIndex: 0,
  bigBlindIndex: 0,
  smallBlindAmount: 5,
  bigBlindAmount: 10,
  minBuyIn: 0,
  maxBuyIn: 0,
  state: TableState.PRE_FLOP,
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
  ...extra,
});

describe("pot accounting", () => {
  it("creates main and side pots based on commitments", () => {
    const table = createTable([
      createPlayer("a", 0, 100),
      createPlayer("b", 1, 200),
      createPlayer("c", 2, 300),
    ]);
    rebuildPots(table);
    expect(table.pots).toEqual([
      { amount: 300, eligibleSeatSet: [0, 1, 2] },
      { amount: 200, eligibleSeatSet: [1, 2] },
    ]);
  });

  it("excludes folded players from eligibility but counts their chips", () => {
    const table = createTable([
      createPlayer("a", 0, 100),
      createPlayer("b", 1, 200),
      createPlayer("c", 2, 100, PlayerState.FOLDED),
    ]);
    rebuildPots(table);
    expect(table.pots).toEqual([{ amount: 300, eligibleSeatSet: [0, 1] }]);
  });

  it("applies rake to each pot", () => {
    const table = createTable(
      [createPlayer("a", 0, 100), createPlayer("b", 1, 100)],
      { rakeConfig: { percentage: 0.1, cap: 5, min: 0 } },
    );
    rebuildPots(table);
    const total = applyRake(table);
    expect(total).toBe(5);
    expect(table.pots[0].amount).toBe(195);
    expect(table.pots[0].rake).toBe(5);
  });

  it("resets round bets while keeping commitments", () => {
    const p1 = createPlayer("a", 0, 50);
    p1.betThisRound = 20;
    const p2 = createPlayer("b", 1, 70);
    p2.betThisRound = 40;
    const table = createTable([p1, p2], { betToCall: 40 });
    resetForNextRound(table);
    expect(table.betToCall).toBe(0);
    expect(table.seats[0]?.betThisRound).toBe(0);
    expect(table.seats[1]?.betThisRound).toBe(0);
    expect(table.seats[0]?.totalCommitted).toBe(50);
    expect(table.seats[1]?.totalCommitted).toBe(70);
  });
});
