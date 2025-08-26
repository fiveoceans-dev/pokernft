"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealHole = dealHole;
exports.dealBoard = dealBoard;
const types_1 = require("./types");
const utils_1 = require("./utils");
/** Deal two hole cards to each active seat starting from the small blind */
function dealHole(table) {
    if (!table.deck.length)
        return;
    const len = table.seats.length;
    // deal one card at a time, starting from small blind
    for (let i = 0; i < 2; i++) {
        for (let offset = 0; offset < len; offset++) {
            const idx = (table.smallBlindIndex + offset) % len;
            const player = table.seats[idx];
            if (player && player.state === types_1.PlayerState.ACTIVE) {
                player.holeCards.push((0, utils_1.draw)(table.deck));
            }
        }
    }
}
/** Deal board cards for the given round */
function dealBoard(table, round, burn = true) {
    if (!table.deck.length)
        return;
    // optional burn card
    if (burn)
        (0, utils_1.draw)(table.deck);
    if (round === types_1.Round.FLOP) {
        table.board.push((0, utils_1.draw)(table.deck), (0, utils_1.draw)(table.deck), (0, utils_1.draw)(table.deck));
    }
    else if (round === types_1.Round.TURN || round === types_1.Round.RIVER) {
        table.board.push((0, utils_1.draw)(table.deck));
    }
}
//# sourceMappingURL=dealer.js.map