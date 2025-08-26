"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
/**
 * Simple in-memory audit logger storing actions for the current hand.
 * Provides helpers to start a new log, record actions and read back the
 * immutable list of actions for persistence or analysis.
 */
class AuditLogger {
    constructor() {
        this.actions = [];
        this.startTs = 0;
        this.seed = "";
        this.rake = 0;
    }
    /** Reset the logger for a new hand */
    startHand(deckSeed) {
        this.actions = [];
        this.startTs = Date.now();
        this.seed = deckSeed;
        this.rake = 0;
    }
    /** Record a hand action with the elapsed time since hand start */
    record(playerId, round, action, amount = 0) {
        const elapsedMs = Date.now() - this.startTs;
        this.actions.push({ playerId, round, action, amount, elapsedMs });
    }
    /** Record total rake taken for the hand */
    recordRake(amount) {
        this.rake = amount;
    }
    /** Return a read-only view of the logged actions */
    get handActions() {
        return this.actions;
    }
    get deckSeed() {
        return this.seed;
    }
    get totalRake() {
        return this.rake;
    }
}
exports.AuditLogger = AuditLogger;
exports.default = AuditLogger;
//# sourceMappingURL=auditLogger.js.map