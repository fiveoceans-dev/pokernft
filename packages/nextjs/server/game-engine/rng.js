"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRNG = setRNG;
exports.random = random;
exports.randomInt = randomInt;
exports.seededRNG = seededRNG;
class DefaultRNG {
    next() {
        return Math.random();
    }
}
let current = new DefaultRNG();
function setRNG(rng) {
    current = rng;
}
function random() {
    return current.next();
}
function randomInt(max) {
    return Math.floor(random() * max);
}
/** Create a deterministic RNG from a string seed */
function seededRNG(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return {
        next() {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
            h ^= h >>> 16;
            return (h >>> 0) / 4294967296;
        },
    };
}
//# sourceMappingURL=rng.js.map