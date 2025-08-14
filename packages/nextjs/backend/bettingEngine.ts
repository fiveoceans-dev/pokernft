import { Table, Player, PlayerState, PlayerAction, Round } from "./types";
import { rebuildPots, resetForNextRound } from "./potManager";
import { isHeadsUp } from "./tableUtils";

/** Initialize betting round and determine first to act */
export function startBettingRound(table: Table, round: Round) {
  table.minRaise = table.bigBlindAmount;
  table.lastFullRaise = null;
  if (round === Round.PREFLOP) {
    // betToCall already equals big blind from blinds
    if (isHeadsUp(table)) {
      table.actingIndex = table.smallBlindIndex;
    } else {
      table.actingIndex = nextSeat(table, table.bigBlindIndex);
    }
  } else {
    resetForNextRound(table);
    if (isHeadsUp(table)) {
      table.actingIndex = table.bigBlindIndex;
    } else {
      table.actingIndex = nextSeat(table, table.buttonIndex);
    }
  }
}

function nextSeat(table: Table, from: number): number | null {
  const len = table.seats.length;
  for (let i = 1; i <= len; i++) {
    const idx = (from + i) % len;
    const p = table.seats[idx];
    if (p && p.state === PlayerState.ACTIVE) return idx;
  }
  return null;
}

/** Process a player's action, enforcing betting rules */
export function applyAction(
  table: Table,
  seatIndex: number,
  action: { type: PlayerAction; amount?: number },
) {
  if (table.actingIndex !== seatIndex) throw new Error("not players turn");
  const player = table.seats[seatIndex];
  if (!player || player.state !== PlayerState.ACTIVE)
    throw new Error("invalid");

  switch (action.type) {
    case PlayerAction.FOLD:
      player.state = PlayerState.FOLDED;
      player.lastAction = PlayerAction.FOLD;
      break;
    case PlayerAction.CHECK:
      if (player.betThisRound !== table.betToCall)
        throw new Error("cannot check");
      player.lastAction = PlayerAction.CHECK;
      break;
    case PlayerAction.CALL: {
      const toCall = table.betToCall - player.betThisRound;
      const commit = Math.min(toCall, player.stack);
      player.stack -= commit;
      player.betThisRound += commit;
      player.totalCommitted += commit;
      player.lastAction =
        commit < toCall ? PlayerAction.ALL_IN : PlayerAction.CALL;
      if (player.stack === 0) player.state = PlayerState.ALL_IN;
      break;
    }
    case PlayerAction.BET: {
      if (table.betToCall !== 0) throw new Error("cannot bet");
      const amount = action.amount ?? 0;
      if (amount < table.minRaise) throw new Error("bet too small");
      const commit = Math.min(amount, player.stack);
      player.stack -= commit;
      player.betThisRound += commit;
      player.totalCommitted += commit;
      table.betToCall = player.betThisRound;
      table.minRaise = commit;
      table.lastFullRaise = seatIndex;
      player.lastAction =
        commit < amount ? PlayerAction.ALL_IN : PlayerAction.BET;
      if (player.stack === 0) player.state = PlayerState.ALL_IN;
      break;
    }
    case PlayerAction.RAISE: {
      if (table.betToCall === 0) throw new Error("nothing to raise");
      if (table.lastFullRaise === seatIndex)
        throw new Error("action not reopened");
      const callAmt = table.betToCall - player.betThisRound;
      const raiseAmt = action.amount ?? 0;
      if (raiseAmt < table.minRaise) throw new Error("raise too small");
      const total = callAmt + raiseAmt;
      const commit = Math.min(total, player.stack);
      player.stack -= commit;
      player.betThisRound += commit;
      player.totalCommitted += commit;
      if (commit > callAmt) {
        table.betToCall = player.betThisRound;
        if (commit - callAmt >= table.minRaise) {
          table.minRaise = commit - callAmt;
          table.lastFullRaise = seatIndex;
        }
      }
      player.lastAction =
        commit < total ? PlayerAction.ALL_IN : PlayerAction.RAISE;
      if (player.stack === 0) player.state = PlayerState.ALL_IN;
      break;
    }
    case PlayerAction.ALL_IN: {
      if (table.lastFullRaise === seatIndex && player.betThisRound < table.betToCall)
        throw new Error("action not reopened");
      const commit = player.stack;
      player.stack = 0;
      player.betThisRound += commit;
      player.totalCommitted += commit;
      if (player.betThisRound > table.betToCall) {
        const diff = player.betThisRound - table.betToCall;
        table.betToCall = player.betThisRound;
        if (diff >= table.minRaise) {
          table.minRaise = diff;
          table.lastFullRaise = seatIndex;
        }
      }
      player.state = PlayerState.ALL_IN;
      player.lastAction = PlayerAction.ALL_IN;
      break;
    }
  }

  // if player is now all-in, recompute pots based on total commitments
  if (player.state === PlayerState.ALL_IN) {
    rebuildPots(table);
  }

  // advance turn
  table.actingIndex = nextToAct(table, seatIndex);
}

function nextToAct(table: Table, from: number): number | null {
  const len = table.seats.length;
  for (let i = 1; i <= len; i++) {
    const idx = (from + i) % len;
    const p = table.seats[idx];
    if (!p) continue;
    if (p.state !== PlayerState.FOLDED && p.state !== PlayerState.ALL_IN) {
      if (p.betThisRound < table.betToCall) return idx;
    }
  }
  // if no one needs to act, round complete
  return null;
}

/** Determine if betting round is complete */
export function isRoundComplete(table: Table): boolean {
  const active = table.seats.filter(
    (p): p is Player =>
      !!p && (p.state === PlayerState.ACTIVE || p.state === PlayerState.ALL_IN),
  );
  if (active.length <= 1) return true;
  if (active.every((p) => p.state === PlayerState.ALL_IN)) return true;

  const maxCommit = Math.max(
    0,
    ...active
      .filter((p) => p.state === PlayerState.ACTIVE)
      .map((p) => p.betThisRound),
  );
  const allMatched = active.every(
    (p) =>
      p.state !== PlayerState.ACTIVE ||
      p.betThisRound === maxCommit ||
      (maxCommit === 0 && p.lastAction === PlayerAction.CHECK),
  );
  const canAct = nextToAct(table, table.actingIndex ?? -1) !== null;
  return allMatched && !canAct;
}
