import { Table, TableState, Round, PlayerState } from "./types";
import { assignBlindsAndButton } from "./blindManager";
import { dealDeck } from "./utils";
import { dealHole } from "./dealer";
import { rebuildPots, awardPots, applyRake } from "./potManager";
import { startBettingRound } from "./bettingEngine";
import { resetTableForNextHand } from "./handReset";
import { countActivePlayers } from "./tableUtils";
import { AuditLogger } from "./auditLogger";
import crypto from "crypto";

/**
 * Attempt to start a new hand by posting blinds, shuffling and
 * dealing hole cards. Returns `true` on success, otherwise
 * `false` when the hand cannot begin (e.g. not enough active
 * players or blinds could not be posted).
 */
export function startTableHand(table: Table, audit?: AuditLogger): boolean {
  if (table.state !== TableState.BLINDS) return false;
  if (countActivePlayers(table) < 2) {
    table.state = TableState.WAITING;
    return false;
  }
  if (!assignBlindsAndButton(table)) {
    table.state = TableState.WAITING;
    return false;
  }
  const seed = crypto.randomBytes(16).toString("hex");
  table.deckSeed = seed;
  table.deck = dealDeck(seed);
  audit?.startHand(seed);
  table.board = [];
  table.pots = [];
  table.currentRound = Round.PREFLOP;
  dealHole(table);
  startBettingRound(table, Round.PREFLOP);
  table.state = TableState.PRE_FLOP;
  return true;
}

/**
 * Resolve the current hand by awarding pots or, if only a single
 * player remains, giving them the entire pot. Afterwards the table
 * is reset for the next hand or returned to the waiting state.
 */
export async function endHand(table: Table, audit?: AuditLogger) {
  const live = table.seats.filter(
    (p): p is NonNullable<typeof p> => !!p && p.state !== PlayerState.FOLDED,
  );
  rebuildPots(table);
  const rake = applyRake(table);
  if (rake > 0) audit?.recordRake(rake);
  if (live.length === 1) {
    const total = table.seats.reduce(
      (sum, p) => sum + (p ? p.totalCommitted : 0),
      0,
    );
    live[0].stack += total;
    table.pots = [];
  } else if (live.length > 1) {
    awardPots(table);
  }
  table.state = TableState.PAYOUT;
  await resetTableForNextHand(table);
}
