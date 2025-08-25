import { describe, it, expect, vi } from "vitest";
import TableManager from "../tableManager";
import {
  Table,
  Player,
  PlayerState,
  PlayerAction,
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
  handStartDelayMs: 1000,
  dealAnimationDelayMs: 0,
});

describe("TableManager", () => {
  it("completes a hand when the first player folds preflop", async () => {
    const table = createTable([
      createPlayer("a", 0, 100),
      createPlayer("b", 1, 100),
    ]);
    const mgr = new TableManager(table);
    const started = mgr.startHand();
    expect(started).toBe(true);
    expect(table.state).toBe(TableState.PRE_FLOP);
    const actor = table.actingIndex!;
    await mgr.handleAction(actor, { type: PlayerAction.FOLD });
    expect(table.state).toBe(TableState.BLINDS);
    expect(table.seats[1]?.stack).toBe(105);
  });

  it("auto-starts a hand after players seat", async () => {
    vi.useFakeTimers();
    const table: Table = {
      ...createTable([null, null]),
      state: TableState.WAITING,
    };
    const mgr = new TableManager(table);
    table.seats[0] = createPlayer("a", 0, 100);
    table.seats[1] = createPlayer("b", 1, 100);
    mgr.handleSeatChange();
    vi.advanceTimersByTime(table.handStartDelayMs);
    expect(table.state).toBe(TableState.PRE_FLOP);
    vi.useRealTimers();
  });
});
