import { describe, expect, test } from 'vitest';
import { SeatingManager } from '../seatingManager';
import { Table, TableState, Round, PlayerState } from '../types';

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
    actionTimer: 0,
    interRoundDelayMs: 0,
    dealAnimationDelayMs: 0,
  };
}

describe('SeatingManager', () => {
  test('seats player and enforces buy-in limits', () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, 'p1', 50);
    expect(p?.stack).toBe(50);
    expect(mgr.seatPlayer(0, 'p2', 50)).toBeNull();
    expect(mgr.seatPlayer(1, 'p2', 10)).toBeNull();
  });

  test('top up and remove broke players', () => {
    const table = createTable();
    const mgr = new SeatingManager(table);
    const p = mgr.seatPlayer(0, 'p1', 50)!;
    expect(mgr.topUp(0, 160)).toBe(false);
    expect(mgr.topUp(0, 150)).toBe(true);
    expect(table.seats[0]?.stack).toBe(200);

    table.seats[0]!.stack = 0;
    mgr.removeBrokePlayers(false);
    expect(table.seats[0]).toBeNull();

    const p2 = mgr.seatPlayer(1, 'p2', 40)!;
    p2.stack = 0;
    mgr.removeBrokePlayers(true);
    expect(table.seats[1]?.state).toBe(PlayerState.SITTING_OUT);
  });
});
