"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUITBIT_BY_ID = exports.BINARIES_BY_ID = exports.NO_FLUSH_7 = exports.NO_FLUSH_6 = exports.NO_FLUSH_5 = exports.FLUSH = exports.SUITS = exports.DP = exports.CHOOSE = void 0;
// Precomputed tables from HenryRLee/PokerHandEvaluator
var dptables_1 = require("./dptables");
Object.defineProperty(exports, "CHOOSE", { enumerable: true, get: function () { return dptables_1.CHOOSE; } });
Object.defineProperty(exports, "DP", { enumerable: true, get: function () { return dptables_1.DP; } });
Object.defineProperty(exports, "SUITS", { enumerable: true, get: function () { return dptables_1.SUITS; } });
var hashtable_1 = require("./hashtable");
Object.defineProperty(exports, "FLUSH", { enumerable: true, get: function () { return hashtable_1.FLUSH; } });
var hashtable5_1 = require("./hashtable5");
Object.defineProperty(exports, "NO_FLUSH_5", { enumerable: true, get: function () { return hashtable5_1.NO_FLUSH_5; } });
var hashtable6_1 = require("./hashtable6");
Object.defineProperty(exports, "NO_FLUSH_6", { enumerable: true, get: function () { return hashtable6_1.NO_FLUSH_6; } });
var hashtable7_1 = require("./hashtable7");
Object.defineProperty(exports, "NO_FLUSH_7", { enumerable: true, get: function () { return hashtable7_1.NO_FLUSH_7; } });
exports.BINARIES_BY_ID = (() => {
    const arr = [];
    for (let i = 0; i < 13; i++) {
        const v = 1 << i;
        arr.push(v, v, v, v);
    }
    return arr;
})();
exports.SUITBIT_BY_ID = (() => {
    const arr = [];
    const vals = [0x1, 0x8, 0x40, 0x200];
    for (let i = 0; i < 13; i++)
        arr.push(...vals);
    return arr;
})();
//# sourceMappingURL=index.js.map