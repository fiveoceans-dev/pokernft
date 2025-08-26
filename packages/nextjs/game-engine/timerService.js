"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerService = void 0;
const types_1 = require("./types");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
/**
 * TimerService manages per‑action timers, optional timebank consumption,
 * disconnect grace periods and animation delays between game events.
 */
class TimerService {
    constructor(table, handlers, disconnectGraceMs = 0) {
        this.table = table;
        this.handlers = handlers;
        this.disconnectGraceMs = disconnectGraceMs;
        this.disconnectTimers = new Map();
    }
    /** Clear any active action timer */
    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = undefined;
        }
    }
    /** Begin countdown for the given player's action */
    startActionTimer(player) {
        this.clearTurnTimer();
        const forceAction = () => {
            const action = this.table.betToCall > 0 ? types_1.PlayerAction.FOLD : types_1.PlayerAction.CHECK;
            this.handlers.onAutoAction(player.id, action);
        };
        // initial per-action timer
        this.turnTimer = setTimeout(() => {
            if (player.timebankMs > 0) {
                const extra = player.timebankMs;
                player.timebankMs = 0;
                this.turnTimer = setTimeout(forceAction, extra);
            }
            else {
                forceAction();
            }
        }, this.table.actionTimer || constants_1.ACTION_TIMEOUT_MS);
    }
    /** Handle player disconnection with a grace timer */
    handleDisconnect(player) {
        this.clearDisconnectTimer(player.id);
        const expire = () => {
            const forceAction = () => {
                const action = this.table.betToCall > 0 ? types_1.PlayerAction.FOLD : types_1.PlayerAction.CHECK;
                this.handlers.onAutoAction(player.id, action);
                this.disconnectTimers.delete(player.id);
            };
            if (player.timebankMs > 0) {
                const extra = player.timebankMs;
                player.timebankMs = 0;
                const tbTimer = setTimeout(forceAction, extra);
                this.disconnectTimers.set(player.id, tbTimer);
            }
            else {
                forceAction();
            }
        };
        const timer = setTimeout(expire, this.disconnectGraceMs);
        this.disconnectTimers.set(player.id, timer);
    }
    /** Clear disconnect timer on reconnection */
    handleReconnect(playerId) {
        this.clearDisconnectTimer(playerId);
    }
    clearDisconnectTimer(id) {
        const timer = this.disconnectTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(id);
        }
    }
    /** Utility: wait for a number of milliseconds */
    static wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /** Deal hole cards with animation delays */
    async dealHoleAnimated(table) {
        if (!table.deck.length)
            return;
        const len = table.seats.length;
        for (let i = 0; i < 2; i++) {
            for (let offset = 0; offset < len; offset++) {
                const idx = (table.smallBlindIndex + offset) % len;
                const player = table.seats[idx];
                if (player && player.state !== types_1.PlayerState.SITTING_OUT) {
                    player.holeCards.push((0, utils_1.draw)(table.deck));
                    await TimerService.wait(table.dealAnimationDelayMs);
                }
            }
        }
    }
    /** Deal board cards with animation delays */
    async dealBoardAnimated(table, round) {
        if (!table.deck.length)
            return;
        // burn card
        (0, utils_1.draw)(table.deck);
        await TimerService.wait(table.dealAnimationDelayMs);
        if (round === types_1.Round.FLOP) {
            for (let i = 0; i < 3; i++) {
                table.board.push((0, utils_1.draw)(table.deck));
                await TimerService.wait(table.dealAnimationDelayMs);
            }
        }
        else if (round === types_1.Round.TURN || round === types_1.Round.RIVER) {
            table.board.push((0, utils_1.draw)(table.deck));
        }
    }
    /** Pause between hands after payouts */
    async interRoundPause() {
        await TimerService.wait(this.table.interRoundDelayMs);
    }
}
exports.TimerService = TimerService;
exports.default = TimerService;
//# sourceMappingURL=timerService.js.map