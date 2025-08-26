"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTableForNextHand = resetTableForNextHand;
const types_1 = require("./types");
const playerStateMachine_1 = require("./playerStateMachine");
const blindManager_1 = require("./blindManager");
const tableUtils_1 = require("./tableUtils");
const timerService_1 = __importDefault(require("./timerService"));
/**
 * Reset per-hand table and player fields after a hand finishes and
 * optionally transition to the next hand if enough players remain.
 */
async function resetTableForNextHand(table, reBuyAllowed = true) {
    // resolve players at hand end and remove any leaving seats
    table.seats.forEach((player, idx) => {
        if (!player)
            return;
        const state = (0, playerStateMachine_1.playerStateReducer)(player.state, {
            type: "HAND_END",
            stack: player.stack,
            reBuyAllowed,
        });
        if (state === types_1.PlayerState.EMPTY || state === types_1.PlayerState.LEAVING) {
            table.seats[idx] = null;
        }
        else {
            player.state = state;
        }
    });
    // prepare remaining players for the upcoming hand
    table.state = types_1.TableState.CLEANUP;
    table.seats.forEach((player) => {
        if (!player)
            return;
        player.state = (0, playerStateMachine_1.playerStateReducer)(player.state, {
            type: "NEW_HAND",
            stack: player.stack,
            bigBlind: table.bigBlindAmount,
            sittingOut: player.state === types_1.PlayerState.SITTING_OUT ||
                player.sitOutNextHand === true,
        });
        player.sitOutNextHand = false;
        player.holeCards = [];
        player.betThisRound = 0;
        player.totalCommitted = 0;
        player.lastAction = types_1.PlayerAction.NONE;
    });
    // advance dealer button to the next active seat
    table.state = types_1.TableState.ROTATE;
    (0, blindManager_1.advanceButton)(table);
    // clear table-level per-hand fields
    table.deck = [];
    table.board = [];
    table.pots = [];
    table.betToCall = 0;
    table.minRaise = 0;
    table.actingIndex = null;
    table.lastFullRaise = null;
    table.actedSinceLastRaise = new Set();
    table.currentRound = types_1.Round.PREFLOP;
    table.smallBlindIndex = -1;
    table.bigBlindIndex = -1;
    const active = (0, tableUtils_1.countActivePlayers)(table);
    if (active >= 2) {
        await timerService_1.default.wait(table.interRoundDelayMs);
        table.state = types_1.TableState.BLINDS;
    }
    else {
        table.state = types_1.TableState.WAITING;
    }
}
exports.default = { resetTableForNextHand };
//# sourceMappingURL=handReset.js.map