import { Table, Player, PlayerState, Pot } from "./types";
import { rankHand, compareHands } from "./handEvaluator";

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

  // Build sorted unique commitment thresholds, ignoring zero as it cannot
  // contribute to a pot. Each threshold represents a layer of chips that at
  // least one player has contributed.
  const thresholds = Array.from(
    new Set(players.map((p) => p.totalCommitted).filter((t) => t > 0)),
  ).sort((a, b) => a - b);

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
  table.actedSinceLastRaise = new Set();
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

/**
 * Distribute chips from all pots to the winning players. Each pot considers
 * only its eligible seats and ignores folded players. Hands are ranked using
 * {@link rankHand} and ties are split evenly with any remainder awarded
 * clockwise from the dealer button. Players who end up with zero chips are
 * marked {@link PlayerState.SITTING_OUT}.
 */
export function awardPots(table: Table) {
  table.pots.forEach((pot) => {
    const contenders = pot.eligibleSeatSet
      .map((i) => table.seats[i])
      .filter((p): p is Player => !!p && p.state !== PlayerState.FOLDED);
    if (contenders.length === 0) {
      pot.amount = 0;
      return;
    }

    const evaluated = contenders.map((p) => ({
      player: p,
      hand: rankHand([...p.holeCards, ...table.board]),
    }));

    let best = evaluated[0].hand;
    evaluated.forEach((e) => {
      if (compareHands(e.hand, best) < 0) best = e.hand;
    });
    const winners = evaluated
      .filter((e) => compareHands(e.hand, best) === 0)
      .map((e) => e.player);

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;
    winners.forEach((w) => (w.stack += share));

    if (remainder > 0) {
      const offset = (table.buttonIndex + 1) % table.seats.length;
      const ordered = winners
        .slice()
        .sort(
          (a, b) =>
            ((a.seatIndex - offset + table.seats.length) % table.seats.length) -
            ((b.seatIndex - offset + table.seats.length) % table.seats.length),
        );
      for (let i = 0; i < remainder; i++) {
        ordered[i % ordered.length].stack += 1;
      }
    }

    pot.amount = 0;
  });

  table.seats.forEach((p) => {
    if (p && p.stack === 0) p.state = PlayerState.SITTING_OUT;
  });
}

export default {
  rebuildPots,
  resetForNextRound,
  applyRake,
  awardPots,
};
