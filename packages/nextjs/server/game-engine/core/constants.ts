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

/** Timing constants from environment variables */
export const ACTION_TIMEOUT_MS = (parseInt(process.env.ACTION_TIMEOUT_SECONDS || "15") * 1000);
export const GAME_START_COUNTDOWN_MS = (parseInt(process.env.GAME_START_COUNTDOWN_SECONDS || "10") * 1000);
export const MIN_PLAYERS_TO_START = parseInt(process.env.MIN_PLAYERS_TO_START || "2");
export const MAX_PLAYERS_PER_TABLE = parseInt(process.env.MAX_PLAYERS_PER_TABLE || "9");
export const STREET_DEAL_DELAY_MS = (parseInt(process.env.STREET_DEAL_DELAY_SECONDS || "3") * 1000);
export const NEW_HAND_DELAY_MS = (parseInt(process.env.NEW_HAND_DELAY_SECONDS || "5") * 1000);

/** Streets in order */
export const STREETS = [
  "preflop",
  "flop",
  "turn",
  "river",
  "showdown",
] as const;
export type Street = (typeof STREETS)[number];
