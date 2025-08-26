import { describe, it, expect } from "vitest";
import { startTableHand, endHand } from "../handLifecycle";
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
  handStartDelayMs: 0,
  dealAnimationDelayMs: 0,
});

describe("handLifecycle", () => {
  it("starts a hand when blinds can be posted", () => {
    const table = createTable([
      createPlayer("a", 0, 100),
      createPlayer("b", 1, 100),
    ]);
    const ok = startTableHand(table);
    expect(ok).toBe(true);
    expect(table.state).toBe(TableState.PRE_FLOP);
    expect(table.seats[0]?.holeCards.length).toBe(2);
    expect(table.seats[1]?.betThisRound).toBeGreaterThan(0);
  });

  it("awards pot to last player and resets table", async () => {
    const p1 = createPlayer("a", 0, 90);
    const p2 = createPlayer("b", 1, 90);
    p1.totalCommitted = 10;
    p2.totalCommitted = 10;
    p2.state = PlayerState.FOLDED;
    const table = createTable([p1, p2]);
    table.pots = [{ amount: 20, eligibleSeatSet: [0, 1] }];
    await endHand(table);
    expect(p1.stack).toBe(110);
    expect(table.pots.length).toBe(0);
    expect(table.state).toBe(TableState.BLINDS);
    expect(table.buttonIndex).toBe(1);
  });
});
