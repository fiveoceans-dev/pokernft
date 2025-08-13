import { Table, Player, PlayerState, Pot } from './types';

/**
 * Rebuild main and side pots based on each player's total commitment.
 * Players are grouped into contribution tiers and each tier forms a pot
 * consisting of the incremental commitments of all players who reached it.
 */
export function rebuildPots(table: Table) {
  const players = table.seats.filter((p): p is Player => !!p);
  if (players.length === 0) {
    table.pots = [];
    return;
  }

  const thresholds = Array.from(new Set(players.map((p) => p.totalCommitted))).sort(
    (a, b) => a - b,
  );

  let previous = 0;
  const pots: Pot[] = [];
  for (const threshold of thresholds) {
    const contributors = players.filter((p) => p.totalCommitted >= threshold);
    if (contributors.length >= 2 && threshold > previous) {
      const amount = (threshold - previous) * contributors.length;
      const eligibleSeatSet = contributors
        .filter((p) => p.state !== PlayerState.FOLDED)
        .map((p) => p.seatIndex);
      pots.push({ amount, eligibleSeatSet });
      previous = threshold;
    }
  }

  table.pots = pots;
}

/**
 * Reset per-round betting state for a new betting round. Total commitment is
 * preserved while individual round bets and bet-to-call are cleared.
 */
export function resetForNextRound(table: Table) {
  table.betToCall = 0;
  table.seats.forEach((p) => {
    if (p) p.betThisRound = 0;
  });
}

/**
 * Apply rake to each pot if a rake configuration is present on the table.
 * Returns the total rake taken across all pots.
 */
export function applyRake(table: Table): number {
  const config = table.rakeConfig;
  if (!config) return 0;

  let total = 0;
  table.pots.forEach((pot) => {
    if (pot.amount < config.min) {
      pot.rake = 0;
      return;
    }
    const raw = Math.floor(pot.amount * config.percentage);
    const rake = Math.min(raw, config.cap);
    pot.amount -= rake;
    pot.rake = rake;
    total += rake;
  });
  return total;
}

export default {
  rebuildPots,
  resetForNextRound,
  applyRake,
};
