import type { Rank, Suit } from "./types";

/** Card ordering (low → high) */
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

// Suits are represented using single lowercase letters:
// s = spades, h = hearts, d = diamonds, c = clubs
export const SUITS: Suit[] = ["s", "h", "d", "c"];

/** Blind levels (edit to taste) */
export const SMALL_BLIND = 5;
export const BIG_BLIND = 10;

/** Default time (ms) a player has to act before auto-check/fold */
export const ACTION_TIMEOUT_MS = 10_000;

/** Streets in order */
export const STREETS = [
  "preflop",
  "flop",
  "turn",
  "river",
  "showdown",
] as const;
export type Street = (typeof STREETS)[number];
