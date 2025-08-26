"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREETS = exports.ACTION_TIMEOUT_MS = exports.BIG_BLIND = exports.SMALL_BLIND = exports.SUITS = exports.RANKS = void 0;
/** Card ordering (low → high) */
exports.RANKS = [
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
exports.SUITS = ["s", "h", "d", "c"];
/** Blind levels (edit to taste) */
exports.SMALL_BLIND = 5;
exports.BIG_BLIND = 10;
/** Default time (ms) a player has to act before auto-check/fold */
exports.ACTION_TIMEOUT_MS = 10000;
/** Streets in order */
exports.STREETS = [
    "preflop",
    "flop",
    "turn",
    "river",
    "showdown",
];
//# sourceMappingURL=constants.js.map