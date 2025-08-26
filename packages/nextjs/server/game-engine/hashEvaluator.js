"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateHand = evaluateHand;
const hashTables_1 = require("./hashTables");
const NO_FLUSHES = {
    5: hashTables_1.NO_FLUSH_5,
    6: hashTables_1.NO_FLUSH_6,
    7: hashTables_1.NO_FLUSH_7,
};
const RANK_MAP = {
    "2": 0,
    "3": 1,
    "4": 2,
    "5": 3,
    "6": 4,
    "7": 5,
    "8": 6,
    "9": 7,
    T: 8,
    J: 9,
    Q: 10,
    K: 11,
    A: 12,
};
// Map suit letters to the indices expected by the evaluator tables
const SUIT_MAP = {
    c: 0, // clubs
    d: 1, // diamonds
    h: 2, // hearts
    s: 3, // spades
};
function cardToId(card) {
    return RANK_MAP[card.rank] * 4 + SUIT_MAP[card.suit];
}
function hashQuinary(quinary, numCards) {
    let sum = 0;
    const length = quinary.length;
    for (let rank = 0; rank < length; rank++) {
        const cnt = quinary[rank];
        if (cnt) {
            sum += hashTables_1.DP[cnt][length - rank - 1][numCards];
            numCards -= cnt;
        }
    }
    return sum;
}
/**
 * Evaluate a set of 5 to 7 cards and return a numeric rank.
 * Smaller ranks are stronger hands.
 */
function evaluateHand(cards) {
    const ids = cards.map(cardToId);
    const handSize = ids.length;
    const noFlush = NO_FLUSHES[handSize];
    if (!noFlush) {
        throw new Error(`The number of cards must be between 5 and 7. passed size: ${handSize}`);
    }
    let suitHash = 0;
    for (const id of ids)
        suitHash += hashTables_1.SUITBIT_BY_ID[id];
    const flushSuit = hashTables_1.SUITS[suitHash] - 1;
    if (flushSuit !== -1) {
        let handBinary = 0;
        for (const id of ids) {
            if (id % 4 === flushSuit)
                handBinary |= hashTables_1.BINARIES_BY_ID[id];
        }
        return hashTables_1.FLUSH[handBinary];
    }
    const quinary = new Array(13).fill(0);
    for (const id of ids)
        quinary[Math.floor(id / 4)]++;
    return noFlush[hashQuinary(quinary, handSize)];
}
//# sourceMappingURL=hashEvaluator.js.map