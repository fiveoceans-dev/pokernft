import { Table, PlayerState, PlayerAction, TableState, Round } from "./types";
import { playerStateReducer } from "./playerStateMachine";
import { advanceButton } from "./blindManager";
import { countActivePlayers } from "./tableUtils";
import TimerService from "./timerService";

/**
 * Reset per-hand table and player fields after a hand finishes and
 * optionally transition to the next hand if enough players remain.
 */
export async function resetTableForNextHand(table: Table, reBuyAllowed = true) {
  // resolve players at hand end and remove any leaving seats
  table.seats.forEach((player, idx) => {
    if (!player) return;
    const state = playerStateReducer(player.state, {
      type: "HAND_END",
      stack: player.stack,
      reBuyAllowed,
    });
    if (state === PlayerState.EMPTY || state === PlayerState.LEAVING) {
      table.seats[idx] = null;
    } else {
      player.state = state;
    }
  });

  // prepare remaining players for the upcoming hand
  table.state = TableState.CLEANUP;
  table.seats.forEach((player) => {
    if (!player) return;
    player.state = playerStateReducer(player.state, {
      type: "NEW_HAND",
      stack: player.stack,
      bigBlind: table.bigBlindAmount,
      sittingOut:
        player.state === PlayerState.SITTING_OUT ||
        player.sitOutNextHand === true,
    });
    player.sitOutNextHand = false;
    player.holeCards = [];
    player.betThisRound = 0;
    player.totalCommitted = 0;
    player.lastAction = PlayerAction.NONE;
  });

  // advance dealer button to the next active seat
  table.state = TableState.ROTATE;
  advanceButton(table);

  // clear table-level per-hand fields
  table.deck = [];
  table.board = [];
  table.pots = [];
  table.betToCall = 0;
  table.minRaise = 0;
  table.actingIndex = null;
  table.lastFullRaise = null;
  table.actedSinceLastRaise = new Set();
  table.currentRound = Round.PREFLOP;
  table.smallBlindIndex = -1;
  table.bigBlindIndex = -1;

  const active = countActivePlayers(table);
  if (active >= 2) {
    await TimerService.wait(table.interRoundDelayMs);
    table.state = TableState.BLINDS;
  } else {
    table.state = TableState.WAITING;
  }
}

export default { resetTableForNextHand };
