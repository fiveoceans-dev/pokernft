import { Table, TableState, Round, PlayerState } from './types';
import { assignBlindsAndButton } from './blindManager';
import { dealDeck } from './utils';
import { dealHoleCards } from './dealer';
import { rebuildPots, awardPots } from './potManager';
import { resetTableForNextHand } from './handReset';
import { countActivePlayers } from './tableUtils';

/**
 * Attempt to start a new hand by posting blinds, shuffling and
 * dealing hole cards. Returns `true` on success, otherwise
 * `false` when the hand cannot begin (e.g. not enough active
 * players or blinds could not be posted).
 */
export function startHand(table: Table): boolean {
  if (table.state !== TableState.BLINDS) return false;
  if (countActivePlayers(table) < 2) {
    table.state = TableState.WAITING;
    return false;
  }
  if (!assignBlindsAndButton(table)) {
    table.state = TableState.WAITING;
    return false;
  }
  table.deck = dealDeck();
  table.board = [];
  table.pots = [];
  table.currentRound = Round.PREFLOP;
  dealHoleCards(table);
  table.state = TableState.PRE_FLOP;
  return true;
}

/**
 * Resolve the current hand by awarding pots or, if only a single
 * player remains, giving them the entire pot. Afterwards the table
 * is reset for the next hand or returned to the waiting state.
 */
export async function endHand(table: Table) {
  const live = table.seats.filter(
    (p): p is NonNullable<typeof p> => !!p && p.state !== PlayerState.FOLDED,
  );
  rebuildPots(table);
  if (live.length === 1) {
    const total = table.pots.reduce((sum, p) => sum + p.amount, 0);
    live[0].stack += total;
    table.pots = [];
  } else if (live.length > 1) {
    awardPots(table);
  }
  table.state = TableState.PAYOUT;
  await resetTableForNextHand(table);
}

export default { startHand, endHand };
