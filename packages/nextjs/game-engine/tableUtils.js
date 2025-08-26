"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countActivePlayers = countActivePlayers;
exports.isHeadsUp = isHeadsUp;
const types_1 = require("./types");
/** Count active players at the table */
function countActivePlayers(table) {
    return table.seats.filter((p) => p && p.state === types_1.PlayerState.ACTIVE).length;
}
/** True when exactly two players remain active */
function isHeadsUp(table) {
    return countActivePlayers(table) === 2;
}
//# sourceMappingURL=tableUtils.js.map