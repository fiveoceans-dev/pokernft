import { describe, it, expect } from "vitest";
import {
  Table,
  Player,
  PlayerState,
  PlayerAction,
  TableState,
  Round,
} from "../types";
import { resetTableForNextHand } from "../handReset";

const createPlayer = (
  id: string,
  seatIndex: number,
  stack: number,
  state: PlayerState = PlayerState.ACTIVE,
): Player => ({
  id,
  seatIndex,
  stack,
  state,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: 0,
  holeCards: ["X" as any, "Y" as any],
  lastAction: PlayerAction.BET,
  missedSmallBlind: false,
  missedBigBlind: false,
});

const createTable = (seats: (Player | null)[]): Table => ({
  seats,
  buttonIndex: 0,
  smallBlindIndex: 0,
  bigBlindIndex: 1,
  smallBlindAmount: 5,
  bigBlindAmount: 10,
  minBuyIn: 0,
  maxBuyIn: 0,
  state: TableState.CLEANUP,
  deck: ["c"] as any,
  board: ["b"] as any,
  pots: [{ amount: 100, eligibleSeatSet: [0, 1] }],
  currentRound: Round.RIVER,
  actingIndex: null,
  betToCall: 20,
  minRaise: 20,
  lastFullRaise: null,
  actedSinceLastRaise: new Set(),
  actionTimer: 0,
  interRoundDelayMs: 0,
  handStartDelayMs: 0,
  dealAnimationDelayMs: 0,
});

describe("resetTableForNextHand", () => {
  it("removes leaving players, advances button and starts next hand", async () => {
    const p1 = createPlayer("a", 0, 100);
    const p2 = createPlayer("b", 1, 100);
    const p3 = createPlayer("c", 2, 100, PlayerState.LEAVING);
    const table = createTable([p1, p2, p3]);

    await resetTableForNextHand(table);

    expect(table.seats[2]).toBeNull();
    expect(table.buttonIndex).toBe(1);
    expect(table.state).toBe(TableState.BLINDS);
    expect(table.board.length).toBe(0);
    expect(table.pots.length).toBe(0);
    expect(table.seats[0]?.holeCards.length).toBe(0);
  });

  it("waits for more players when fewer than two can post", async () => {
    const p1 = createPlayer("a", 0, 100);
    const p2 = createPlayer("b", 1, 0);
    const table = createTable([p1, p2]);

    await resetTableForNextHand(table);

    expect(table.state).toBe(TableState.WAITING);
  });

  it("removes broke players when re-buy disabled", async () => {
    const p1 = createPlayer("a", 0, 0);
    const p2 = createPlayer("b", 1, 100);
    const table = createTable([p1, p2]);

    await resetTableForNextHand(table, false);

    expect(table.seats[0]).toBeNull();
  });
});
