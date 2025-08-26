import { describe, expect, test } from "vitest";
import { SeatingManager } from "../seatingManager";
import { Table, TableState, Round, PlayerState } from "../types";
import { resetTableForNextHand } from "../handReset";

function createTable(): Table {
  return {
    seats: Array(6).fill(null),
    buttonIndex: 0,
    smallBlindIndex: -1,
    bigBlindIndex: -1,
    smallBlindAmount: 1,
    bigBlindAmount: 2,
    minBuyIn: 20,
    maxBuyIn: 200,
    state: TableState.WAITING,
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
}

describe("SeatingManager", () => {
  test("seats player and enforces buy-in limits", () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, "p1", 50);
    expect(p?.stack).toBe(50);
    expect(mgr.seatPlayer(0, "p2", 50)).toBeNull();
    expect(mgr.seatPlayer(1, "p2", 10)).toBeNull();
  });

  test("rejects seating the same player id twice", () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    expect(mgr.seatPlayer(0, "p1", 50)).not.toBeNull();
    expect(mgr.seatPlayer(1, "p1", 50)).toBeNull();
  });

  test("allows same player id on different tables", () => {
    const table1 = createTable();
    const table2 = createTable();
    const mgr1 = new SeatingManager(table1);
    const mgr2 = new SeatingManager(table2);
    expect(mgr1.seatPlayer(0, "p1", 50)).not.toBeNull();
    expect(mgr2.seatPlayer(0, "p1", 50)).not.toBeNull();

  });

  test("top up and handle broke players", () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, "p1", 50)!;
    expect(mgr.topUp(0, 160)).toBe(false);
    expect(mgr.topUp(0, 150)).toBe(true);
    expect(table.seats[0]?.stack).toBe(200);

    table.seats[0]!.stack = 0;
    mgr.removeBrokePlayers(false);
    expect(table.seats[0]?.state).toBe(PlayerState.LEAVING);
    expect(table.seats[0]).not.toBeNull();

    const p2 = mgr.seatPlayer(1, "p2", 40)!;
    p2.stack = 0;
    mgr.removeBrokePlayers(true);
    expect(table.seats[1]?.state).toBe(PlayerState.SITTING_OUT);
  });

  test("voluntary sit-out toggles after current hand", () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, "p1", 50)!;
    p.state = PlayerState.ACTIVE;
    table.state = TableState.PRE_FLOP;
    mgr.sitOut(0);
    expect(p.state).toBe(PlayerState.ACTIVE);
    expect(p.sitOutNextHand).toBe(true);
  });

  test("leave during hand marks player and removes on hand end", async () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, "p1", 50)!;
    p.state = PlayerState.ACTIVE;
    table.state = TableState.FLOP;
    mgr.leave(0);
    expect(table.seats[0]?.state).toBe(PlayerState.LEAVING);
    await resetTableForNextHand(table, false);
    expect(table.seats[0]).toBeNull();
  });
});
