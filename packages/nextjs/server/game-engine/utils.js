"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealDeck = void 0;
exports.freshDeck = freshDeck;
exports.shuffle = shuffle;
exports.shuffleWithSeed = shuffleWithSeed;
exports.draw = draw;
exports.indexToCard = indexToCard;
exports.cardToIndex = cardToIndex;
const constants_1 = require("./constants");
const rng_1 = require("./rng");
/* ─────── Random + Deck helpers ─────── */
function freshDeck(seed) {
    const deck = [];
    for (const suit of constants_1.SUITS)
        for (const rank of constants_1.RANKS)
            deck.push({ rank, suit });
    return seed ? shuffleWithSeed(deck, seed) : shuffle(deck);
}
/** Convenience alias used by higher level room logic */
exports.dealDeck = freshDeck;
/** Fisher-Yates in-place shuffle (returns same ref for convenience) */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = (0, rng_1.randomInt)(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
/** Deterministic shuffle using a string seed */
function shuffleWithSeed(array, seed) {
    const rng = (0, rng_1.seededRNG)(seed);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
/** Draws & returns the **top** card (mutates deck) */
function draw(deck) {
    const card = deck.pop();
    if (!card)
        throw new Error("Deck underflow");
    return card;
}
/** Convert a numeric card code (0..51) into a Card object */
function indexToCard(code) {
    const rank = constants_1.RANKS[code % constants_1.RANKS.length];
    const suit = constants_1.SUITS[Math.floor(code / constants_1.RANKS.length)];
    return { rank, suit };
}
/** Convert a Card object back into its numeric code (0..51) */
function cardToIndex(card) {
    return constants_1.SUITS.indexOf(card.suit) * constants_1.RANKS.length + constants_1.RANKS.indexOf(card.rank);
}
//# sourceMappingURL=utils.js.map