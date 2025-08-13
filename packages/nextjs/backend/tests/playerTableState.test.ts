import { describe, it, expect } from 'vitest';
import { playerStateReducer } from '../playerStateMachine';
import { PlayerState, TableState } from '../types';
import { TableStateMachine } from '../tableStateMachine';

describe('playerStateReducer', () => {
  it('activates player with sufficient stack', () => {
    const state = playerStateReducer(PlayerState.SEATED, {
      type: 'NEW_HAND',
      stack: 50,
      bigBlind: 10,
      sittingOut: false,
    });
    expect(state).toBe(PlayerState.ACTIVE);
  });

  it('folds player on fold action', () => {
    const state = playerStateReducer(PlayerState.ACTIVE, { type: 'FOLD' });
    expect(state).toBe(PlayerState.FOLDED);
  });
});

describe('TableStateMachine', () => {
  it('progresses through a full hand', () => {
    const sm = new TableStateMachine();
    sm.dispatch({ type: 'START_HAND', activeSeats: 2 });
    expect(sm.state).toBe(TableState.BLINDS);
    sm.dispatch({ type: 'BLINDS_POSTED' });
    expect(sm.state).toBe(TableState.DEALING_HOLE);
    sm.dispatch({ type: 'DEALING_COMPLETE' });
    expect(sm.state).toBe(TableState.PRE_FLOP);
    sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.FLOP);
    sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.TURN);
    sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.RIVER);
    sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
    expect(sm.state).toBe(TableState.SHOWDOWN);
    sm.dispatch({ type: 'SHOWDOWN_COMPLETE' });
    expect(sm.state).toBe(TableState.PAYOUT);
    sm.dispatch({ type: 'PAYOUT_COMPLETE' });
    expect(sm.state).toBe(TableState.ROTATE);
    sm.dispatch({ type: 'ROTATION_COMPLETE' });
    expect(sm.state).toBe(TableState.CLEANUP);
    sm.dispatch({ type: 'CLEANUP_COMPLETE', activeSeats: 2 });
    expect(sm.state).toBe(TableState.BLINDS);
  });
});
