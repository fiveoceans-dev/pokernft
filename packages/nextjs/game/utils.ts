// src/game/utils.ts
import { RANKS, SUITS } from './constants';
import type { Card } from './types';

/* ─────────── Random + Deck helpers ─────────── */

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit });
  return shuffle(deck);
}

/** Fisher-Yates in-place shuffle (returns same ref for convenience) */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Draws & returns the **top** card (mutates deck) */
export function draw(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) throw new Error('Deck underflow');
  return card;
}

/* ─────────── Hand-ranking stub ───────────
   For production, wire in a proper evaluator like:
   npm i poker-evaluator
   import { evalHand } from 'poker-evaluator';
   Then replace rankHand() below.
   ---------------------------------------- */

export interface RankedHand {
  rankValue: number;    // lower = better (1 = Royal Flush)
  bestCards: Card[];    // the 5-card best hand
}

/** Naïve fallback: high-card only.  Safe to replace later. */
export function rankHand(sevenCards: Card[]): RankedHand {
  const sorted = [...sevenCards].sort(
    (a, b) => RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank)
  );
  return { rankValue: 10, bestCards: sorted.slice(0, 5) }; // 10 = "high card"
}

/** Returns < 0 if A wins, > 0 if B wins, 0 = tie */
export function compareHands(a: RankedHand, b: RankedHand): number {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  // tie-breaker: compare best card ranks
  for (let i = 0; i < 5; i++) {
    const diff =
      RANKS.indexOf(b.bestCards[i].rank) -
      RANKS.indexOf(a.bestCards[i].rank);
    if (diff !== 0) return diff;
  }
  return 0;
}
