// src/game/constants.ts
import type { Rank, Suit } from './types';

/** Card ordering (low → high) */
export const RANKS: Rank[] = [
  '2', '3', '4', '5', '6',
  '7', '8', '9', 'T', 'J', 'Q', 'K', 'A',
];

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

/** Blind levels (edit to taste) */
export const SMALL_BLIND = 5;
export const BIG_BLIND   = 10;

/** Streets in order */
export const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
export type Street = typeof STREETS[number];
