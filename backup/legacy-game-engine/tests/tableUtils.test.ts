import { describe, it, expect } from "vitest";
import { isHeadsUp } from "../tableUtils";
import {
  Player,
  PlayerAction,
  PlayerState,
  Table,
  TableState,
  Round,
} from "../types";

const createPlayer = (id: string, seatIndex: number): Player => ({
  id,
  seatIndex,
  stack: 100,
  state: PlayerState.ACTIVE,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: 0,
  holeCards: [],
  lastAction: PlayerAction.NONE,
});

const createTable = (seats: (Player | null)[]): Table => ({
  seats,
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
});

describe("tableUtils", () => {
  it("detects heads-up tables", () => {
    const table = createTable([createPlayer("a", 0), createPlayer("b", 1)]);
    expect(isHeadsUp(table)).toBe(true);
    table.seats.push(createPlayer("c", 2));
    expect(isHeadsUp(table)).toBe(false);
  });
});
