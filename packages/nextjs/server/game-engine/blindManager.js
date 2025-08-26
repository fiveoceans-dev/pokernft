"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlindManager = void 0;
exports.advanceButton = advanceButton;
exports.assignBlindsAndButton = assignBlindsAndButton;
const types_1 = require("./types");
const potManager_1 = require("./potManager");
const tableUtils_1 = require("./tableUtils");
/**
 * BlindManager computes small/big blind positions and posts the blinds.
 * It assumes `room.minBet` represents the big blind and deducts the
 * corresponding amounts from each player.
 */
class BlindManager {
    constructor(smallBlind, bigBlind) {
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
    }
    /** Return the indices for small and big blinds */
    getBlindIndices(room) {
        const sb = this.nextActiveIndex(room, room.dealerIndex + 1);
        const bb = this.nextActiveIndex(room, sb + 1);
        return { sb, bb };
    }
    /** Post blinds to the pot and update player bets */
    postBlinds(room) {
        const { sb, bb } = this.getBlindIndices(room);
        const sbPlayer = room.players[sb];
        const bbPlayer = room.players[bb];
        const sbAmt = Math.min(this.smallBlind, sbPlayer.chips);
        const bbAmt = Math.min(this.bigBlind, bbPlayer.chips);
        sbPlayer.chips -= sbAmt;
        sbPlayer.currentBet = sbAmt;
        bbPlayer.chips -= bbAmt;
        bbPlayer.currentBet = bbAmt;
        room.pot += sbAmt + bbAmt;
        return { sb, bb };
    }
    /** Find the next active player index starting from `start` */
    nextActiveIndex(room, start) {
        let idx = start % room.players.length;
        while (room.players[idx].hasFolded) {
            idx = (idx + 1) % room.players.length;
        }
        return idx;
    }
}
exports.BlindManager = BlindManager;
/** Move the dealer button to the next active seat clockwise */
function advanceButton(table) {
    const len = table.seats.length;
    for (let i = 1; i <= len; i++) {
        const idx = (table.buttonIndex + i) % len;
        const p = table.seats[idx];
        if (p && p.state === types_1.PlayerState.ACTIVE) {
            table.buttonIndex = idx;
            table.seats.forEach((s, j) => {
                if (s)
                    s.hasButton = j === idx;
            });
            return;
        }
    }
}
/**
 * Assign button, small blind and big blind for a {@link Table} and attempt to
 * post the blinds according to player stacks. Returns `true` when both blinds
 * were posted successfully, otherwise `false` indicating the hand cannot
 * start.
 */
function assignBlindsAndButton(table) {
    if ((0, tableUtils_1.countActivePlayers)(table) < 2)
        return false;
    const activeSeat = (start, blind) => {
        const len = table.seats.length;
        for (let i = 0; i < len; i++) {
            const idx = (start + i) % len;
            const p = table.seats[idx];
            if (!p)
                continue;
            if (p.state === types_1.PlayerState.ACTIVE) {
                if (blind === "SB" && p.missedBigBlind) {
                    continue;
                }
                if (table.deadBlindRule === types_1.DeadBlindRule.WAIT &&
                    (p.missedBigBlind || p.missedSmallBlind)) {
                    if (blind === "SB")
                        p.missedSmallBlind = true;
                    else
                        p.missedBigBlind = true;
                    continue;
                }
                return idx;
            }
            else {
                if (blind === "SB")
                    p.missedSmallBlind = true;
                else
                    p.missedBigBlind = true;
            }
        }
        return null;
    };
    const collectMissed = (player) => {
        if (table.deadBlindRule === types_1.DeadBlindRule.POST) {
            if (player.missedSmallBlind) {
                const amt = Math.min(table.smallBlindAmount, player.stack);
                player.stack -= amt;
                player.missedSmallBlind = false;
            }
            if (player.missedBigBlind) {
                const amt = Math.min(table.bigBlindAmount, player.stack);
                player.stack -= amt;
                player.betThisRound += amt;
                player.totalCommitted += amt;
                player.missedBigBlind = false;
            }
        }
    };
    const postBlind = (player, amount) => {
        if (!player.autoPostBlinds)
            return false;
        collectMissed(player);
        if (player.stack >= amount) {
            player.stack -= amount;
            player.betThisRound += amount;
            player.totalCommitted += amount;
            player.lastAction = types_1.PlayerAction.BET;
            return true;
        }
        if (player.stack > 0) {
            player.betThisRound += player.stack;
            player.totalCommitted += player.stack;
            player.stack = 0;
            player.state = types_1.PlayerState.ALL_IN;
            player.lastAction = types_1.PlayerAction.ALL_IN;
            return true;
        }
        return false;
    };
    const btn = table.buttonIndex;
    table.seats.forEach((p, i) => {
        if (p)
            p.hasButton = i === btn;
    });
    if (table.deadBlindRule === types_1.DeadBlindRule.WAIT) {
        table.seats.forEach((p) => {
            if (p && p.missedBigBlind)
                p.missedSmallBlind = true;
        });
    }
    let sb = null;
    let bb = null;
    let sbDeclined = false;
    const initialActive = (0, tableUtils_1.countActivePlayers)(table);
    const computeBlinds = () => {
        const headsUp = initialActive === 2 || sbDeclined;
        if (headsUp) {
            // Heads-up: the button also posts the small blind and the
            // opposing seat posts the big blind.
            sb = btn;
            bb = activeSeat(btn + 1, "BB");
        }
        else {
            const first = (btn + 1) % table.seats.length;
            const firstSeat = table.seats[first];
            if (firstSeat?.state !== types_1.PlayerState.ACTIVE) {
                sb = activeSeat(btn + 1, "SB");
                bb = sb !== null ? activeSeat(sb + 1, "BB") : null;
            }
            else if (firstSeat.missedBigBlind) {
                sb = btn;
                bb = activeSeat(first, "BB");
            }
            else {
                sb = activeSeat(btn + 1, "SB");
                bb = sb !== null ? activeSeat(sb + 1, "BB") : null;
            }
        }
    };
    computeBlinds();
    while (sb !== null && bb !== null) {
        const sbPlayer = table.seats[sb];
        const bbPlayer = table.seats[bb];
        const sbPosted = postBlind(sbPlayer, table.smallBlindAmount);
        const bbPosted = postBlind(bbPlayer, table.bigBlindAmount);
        if (!sbPosted && !sbPlayer.autoPostBlinds)
            sbDeclined = true;
        if (sbPosted && bbPosted)
            break;
        if (!sbPosted) {
            sbPlayer.state = types_1.PlayerState.SITTING_OUT;
            sbPlayer.missedSmallBlind = true;
        }
        if (!bbPosted) {
            bbPlayer.state = types_1.PlayerState.SITTING_OUT;
            bbPlayer.missedBigBlind = true;
        }
        const remaining = (0, tableUtils_1.countActivePlayers)(table);
        if (remaining < 2)
            return false;
        computeBlinds();
        if (sb === null || bb === null)
            return false;
    }
    if (sb === null || bb === null)
        return false;
    table.smallBlindIndex = sb;
    table.bigBlindIndex = bb;
    table.betToCall = table.bigBlindAmount;
    if ((0, tableUtils_1.isHeadsUp)(table)) {
        // Preflop in heads-up: small blind (on the button) acts first.
        table.actingIndex = sb;
    }
    else {
        const first = activeSeat(bb + 1, "BB");
        table.actingIndex = first ?? sb;
    }
    if (table.seats[sb]?.state === types_1.PlayerState.ALL_IN ||
        table.seats[bb]?.state === types_1.PlayerState.ALL_IN) {
        (0, potManager_1.rebuildPots)(table);
    }
    return true;
}
//# sourceMappingURL=blindManager.js.map