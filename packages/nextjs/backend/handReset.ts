import {
  Table,
  PlayerState,
  PlayerAction,
  TableState,
  Round,
} from './types';
import { playerStateReducer } from './playerStateMachine';
import { advanceButton } from './blindManager';
import { countActivePlayers } from './tableUtils';
import TimerService from './timerService';

/**
 * Reset per-hand table and player fields after a hand finishes and
 * optionally transition to the next hand if enough players remain.
 */
export async function resetTableForNextHand(
  table: Table,
  reBuyAllowed = true,
) {
  // clear table-level per-hand fields
  table.deck = [];
  table.board = [];
  table.pots = [];
  table.betToCall = 0;
  table.minRaise = 0;
  table.actingIndex = null;
  table.lastFullRaise = null;
  table.currentRound = Round.PREFLOP;
  table.smallBlindIndex = -1;
  table.bigBlindIndex = -1;

  // reset each seat and remove players marked for leaving
  table.seats.forEach((player, idx) => {
    if (!player) return;

    // resolve leaving players and zero stacks
    let state = playerStateReducer(player.state, {
      type: 'HAND_END',
      stack: player.stack,
      reBuyAllowed,
    });
    if (state === PlayerState.EMPTY || state === PlayerState.LEAVING) {
      table.seats[idx] = null;
      return;
    }

    // set up state for the upcoming hand
    state = playerStateReducer(state, {
      type: 'NEW_HAND',
      stack: player.stack,
      bigBlind: table.bigBlindAmount,
      sittingOut: state === PlayerState.SITTING_OUT || player.sitOutNextHand === true,
    });
    player.state = state;
    player.sitOutNextHand = false;

    // clear per-hand player fields
    player.holeCards = [];
    player.betThisRound = 0;
    player.totalCommitted = 0;
    player.lastAction = PlayerAction.NONE;
  });

  // move button in case current seat was removed
  advanceButton(table);

  const active = countActivePlayers(table);
  if (active >= 2) {
    await TimerService.wait(table.interRoundDelayMs);
    table.state = TableState.BLINDS;
  } else {
    table.state = TableState.WAITING;
  }
}

export default { resetTableForNextHand };
