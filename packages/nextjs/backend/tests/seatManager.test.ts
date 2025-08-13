import { describe, it, expect } from 'vitest';
import { handleEndOfHand } from '../seatManager';
import { Player, PlayerAction, PlayerState, Table, TableState, Round } from '../types';

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
  holeCards: [],
  lastAction: PlayerAction.NONE,
});

describe('handleEndOfHand', () => {
  const baseTable: Table = {
    seats: [],
    buttonIndex: 0,
    smallBlindIndex: 0,
    bigBlindIndex: 1,
    smallBlindAmount: 5,
    bigBlindAmount: 10,
    minBuyIn: 0,
    maxBuyIn: 0,
    state: TableState.CLEANUP,
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
  };

  it('marks busted players sitting out when rebuy allowed', () => {
    const table: Table = { ...baseTable, seats: [createPlayer('a', 0, 0)] };
    handleEndOfHand(table, { rebuyAllowed: true, minToPlay: 10 });
    expect(table.seats[0]?.state).toBe(PlayerState.SITTING_OUT);
  });

  it('removes busted players when rebuy disallowed', () => {
    const table: Table = { ...baseTable, seats: [createPlayer('a', 0, 0)] };
    handleEndOfHand(table, { rebuyAllowed: false, minToPlay: 10 });
    expect(table.seats[0]).toBeNull();
  });

  it('removes players marked leaving', () => {
    const table: Table = {
      ...baseTable,
      seats: [createPlayer('a', 0, 20, PlayerState.LEAVING)],
    };
    handleEndOfHand(table, { rebuyAllowed: true, minToPlay: 10 });
    expect(table.seats[0]).toBeNull();
  });

  it('applies voluntary sit-out after the hand', () => {
    const p = createPlayer('a', 0, 20);
    p.sitOutNextHand = true;
    const table: Table = { ...baseTable, seats: [p] };
    handleEndOfHand(table, { rebuyAllowed: true, minToPlay: 10 });
    expect(table.seats[0]?.state).toBe(PlayerState.SITTING_OUT);
    expect(table.seats[0]?.sitOutNextHand).toBeFalsy();
  });
});

