"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTableHand = startTableHand;
exports.endHand = endHand;
const types_1 = require("./types");
const blindManager_1 = require("./blindManager");
const utils_1 = require("./utils");
const dealer_1 = require("./dealer");
const potManager_1 = require("./potManager");
const bettingEngine_1 = require("./bettingEngine");
const handReset_1 = require("./handReset");
const tableUtils_1 = require("./tableUtils");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Attempt to start a new hand by posting blinds, shuffling and
 * dealing hole cards. Returns `true` on success, otherwise
 * `false` when the hand cannot begin (e.g. not enough active
 * players or blinds could not be posted).
 */
function startTableHand(table, audit) {
    if (table.state !== types_1.TableState.BLINDS)
        return false;
    if ((0, tableUtils_1.countActivePlayers)(table) < 2) {
        table.state = types_1.TableState.WAITING;
        return false;
    }
    if (!(0, blindManager_1.assignBlindsAndButton)(table)) {
        table.state = types_1.TableState.WAITING;
        return false;
    }
    const seed = crypto_1.default.randomBytes(16).toString("hex");
    table.deckSeed = seed;
    table.deck = (0, utils_1.dealDeck)(seed);
    audit?.startHand(seed);
    table.board = [];
    table.pots = [];
    table.currentRound = types_1.Round.PREFLOP;
    (0, dealer_1.dealHole)(table);
    (0, bettingEngine_1.startBettingRound)(table, types_1.Round.PREFLOP);
    table.state = types_1.TableState.PRE_FLOP;
    return true;
}
/**
 * Resolve the current hand by awarding pots or, if only a single
 * player remains, giving them the entire pot. Afterwards the table
 * is reset for the next hand or returned to the waiting state.
 */
async function endHand(table, audit) {
    const live = table.seats.filter((p) => !!p && p.state !== types_1.PlayerState.FOLDED);
    (0, potManager_1.rebuildPots)(table);
    const rake = (0, potManager_1.applyRake)(table);
    if (rake > 0)
        audit?.recordRake(rake);
    if (live.length === 1) {
        const total = table.seats.reduce((sum, p) => sum + (p ? p.totalCommitted : 0), 0);
        live[0].stack += total;
        table.pots = [];
    }
    else if (live.length > 1) {
        (0, potManager_1.awardPots)(table);
    }
    table.state = types_1.TableState.PAYOUT;
    await (0, handReset_1.resetTableForNextHand)(table);
}
//# sourceMappingURL=handLifecycle.js.map