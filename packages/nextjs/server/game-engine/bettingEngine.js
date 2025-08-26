"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBettingRound = startBettingRound;
exports.applyAction = applyAction;
exports.applyActionFromJson = applyActionFromJson;
exports.isBettingRoundComplete = isBettingRoundComplete;
const types_1 = require("./types");
const potManager_1 = require("./potManager");
const tableUtils_1 = require("./tableUtils");
const jsonFormats_1 = require("./jsonFormats");
/** Initialize betting round and determine first to act */
function startBettingRound(table, round) {
    table.minRaise = table.bigBlindAmount;
    table.lastFullRaise = null;
    table.actedSinceLastRaise = new Set();
    if (round === types_1.Round.PREFLOP) {
        // betToCall already equals big blind from blinds
        if ((0, tableUtils_1.isHeadsUp)(table)) {
            // Heads-up preflop: the button posts the small blind and acts first.
            table.actingIndex = table.smallBlindIndex;
        }
        else {
            table.actingIndex = nextSeat(table, table.bigBlindIndex);
        }
    }
    else {
        (0, potManager_1.resetForNextRound)(table);
        if ((0, tableUtils_1.isHeadsUp)(table)) {
            // Heads-up postflop: the player without the button (big blind) acts first.
            table.actingIndex = table.bigBlindIndex;
        }
        else {
            table.actingIndex = nextSeat(table, table.buttonIndex);
        }
    }
}
function nextSeat(table, from) {
    const len = table.seats.length;
    for (let i = 1; i <= len; i++) {
        const idx = (from + i) % len;
        const p = table.seats[idx];
        if (p && p.state === types_1.PlayerState.ACTIVE)
            return idx;
    }
    return null;
}
/** Process a player's action, enforcing betting rules */
function applyAction(table, seatIndex, action, audit) {
    if (table.actingIndex !== seatIndex)
        throw new Error("not players turn");
    const player = table.seats[seatIndex];
    if (!player || player.state !== types_1.PlayerState.ACTIVE)
        throw new Error("invalid");
    const acted = table.actedSinceLastRaise;
    let commit = 0;
    switch (action.type) {
        case types_1.PlayerAction.FOLD:
            player.state = types_1.PlayerState.FOLDED;
            player.lastAction = types_1.PlayerAction.FOLD;
            acted.add(seatIndex);
            break;
        case types_1.PlayerAction.CHECK:
            if (player.betThisRound !== table.betToCall)
                throw new Error("cannot check");
            player.lastAction = types_1.PlayerAction.CHECK;
            acted.add(seatIndex);
            break;
        case types_1.PlayerAction.CALL: {
            const toCall = table.betToCall - player.betThisRound;
            commit = Math.min(toCall, player.stack);
            player.stack -= commit;
            player.betThisRound += commit;
            player.totalCommitted += commit;
            player.lastAction =
                commit < toCall ? types_1.PlayerAction.ALL_IN : types_1.PlayerAction.CALL;
            if (player.stack === 0)
                player.state = types_1.PlayerState.ALL_IN;
            acted.add(seatIndex);
            break;
        }
        case types_1.PlayerAction.BET: {
            if (table.betToCall !== 0)
                throw new Error("cannot bet");
            const amount = action.amount ?? 0;
            if (amount < table.minRaise)
                throw new Error("bet too small");
            commit = Math.min(amount, player.stack);
            player.stack -= commit;
            player.betThisRound += commit;
            player.totalCommitted += commit;
            table.betToCall = player.betThisRound;
            table.minRaise = commit;
            table.lastFullRaise = seatIndex;
            player.lastAction =
                commit < amount ? types_1.PlayerAction.ALL_IN : types_1.PlayerAction.BET;
            acted.clear();
            acted.add(seatIndex);
            if (player.stack === 0)
                player.state = types_1.PlayerState.ALL_IN;
            break;
        }
        case types_1.PlayerAction.RAISE: {
            if (table.betToCall === 0)
                throw new Error("nothing to raise");
            if (table.lastFullRaise !== null &&
                table.actedSinceLastRaise.has(seatIndex))
                throw new Error("action not reopened");
            const callAmt = table.betToCall - player.betThisRound;
            const raiseAmt = action.amount ?? 0;
            if (raiseAmt < table.minRaise)
                throw new Error("raise too small");
            const total = callAmt + raiseAmt;
            commit = Math.min(total, player.stack);
            player.stack -= commit;
            player.betThisRound += commit;
            player.totalCommitted += commit;
            if (commit > callAmt) {
                table.betToCall = player.betThisRound;
                if (commit - callAmt >= table.minRaise) {
                    table.minRaise = commit - callAmt;
                    table.lastFullRaise = seatIndex;
                    acted.clear();
                    acted.add(seatIndex);
                }
                else {
                    acted.add(seatIndex);
                }
            }
            else {
                acted.add(seatIndex);
            }
            player.lastAction =
                commit < total ? types_1.PlayerAction.ALL_IN : types_1.PlayerAction.RAISE;
            if (player.stack === 0)
                player.state = types_1.PlayerState.ALL_IN;
            break;
        }
        case types_1.PlayerAction.ALL_IN: {
            commit = player.stack;
            const newTotal = player.betThisRound + commit;
            const diff = newTotal - table.betToCall;
            if (table.lastFullRaise !== null &&
                table.actedSinceLastRaise.has(seatIndex) &&
                diff > 0 &&
                diff < table.minRaise)
                throw new Error("action not reopened");
            player.stack = 0;
            player.betThisRound = newTotal;
            player.totalCommitted += commit;
            if (diff > 0) {
                table.betToCall = newTotal;
                if (diff >= table.minRaise) {
                    table.minRaise = diff;
                    table.lastFullRaise = seatIndex;
                    acted.clear();
                    acted.add(seatIndex);
                }
                else {
                    acted.add(seatIndex);
                }
            }
            else {
                acted.add(seatIndex);
            }
            player.state = types_1.PlayerState.ALL_IN;
            player.lastAction = types_1.PlayerAction.ALL_IN;
            break;
        }
    }
    // if player is now all-in, recompute pots based on total commitments
    if (player.state === types_1.PlayerState.ALL_IN) {
        (0, potManager_1.rebuildPots)(table);
    }
    // record action for audit purposes
    audit?.record(player.id, table.currentRound, action.type, commit);
    // advance turn
    table.actingIndex = nextToAct(table, seatIndex);
}
function applyActionFromJson(req) {
    const table = (0, jsonFormats_1.tableFromJson)(req.table);
    applyAction(table, req.seatIndex, req.action);
    return { actingIndex: table.actingIndex, table: (0, jsonFormats_1.tableToJson)(table) };
}
function nextToAct(table, from) {
    const len = table.seats.length;
    for (let i = 1; i <= len; i++) {
        const idx = (from + i) % len;
        const p = table.seats[idx];
        if (!p)
            continue;
        if (p.state !== types_1.PlayerState.FOLDED && p.state !== types_1.PlayerState.ALL_IN) {
            if (p.betThisRound < table.betToCall)
                return idx;
        }
    }
    // if no one needs to act, round complete
    return null;
}
/** Determine if betting round is complete */
function isBettingRoundComplete(table) {
    const active = table.seats.filter((p) => !!p && (p.state === types_1.PlayerState.ACTIVE || p.state === types_1.PlayerState.ALL_IN));
    if (active.length <= 1)
        return true;
    if (active.every((p) => p.state === types_1.PlayerState.ALL_IN))
        return true;
    const maxCommit = Math.max(0, ...active
        .filter((p) => p.state === types_1.PlayerState.ACTIVE)
        .map((p) => p.betThisRound));
    const allMatched = active.every((p) => p.state !== types_1.PlayerState.ACTIVE ||
        p.betThisRound === maxCommit ||
        (maxCommit === 0 && p.lastAction === types_1.PlayerAction.CHECK));
    const canAct = nextToAct(table, table.actingIndex ?? -1) !== null;
    return allMatched && !canAct;
}
//# sourceMappingURL=bettingEngine.js.map