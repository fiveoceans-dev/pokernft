import type { Rank, Suit } from "./types";
/** Card ordering (low → high) */
export declare const RANKS: Rank[];
export declare const SUITS: Suit[];
/** Blind levels (edit to taste) */
export declare const SMALL_BLIND = 5;
export declare const BIG_BLIND = 10;
/** Default time (ms) a player has to act before auto-check/fold */
export declare const ACTION_TIMEOUT_MS = 10000;
/** Streets in order */
export declare const STREETS: readonly ["preflop", "flop", "turn", "river", "showdown"];
export type Street = (typeof STREETS)[number];
