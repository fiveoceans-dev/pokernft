import { HandAction, PlayerAction, Round } from "./types";
/**
 * Simple in-memory audit logger storing actions for the current hand.
 * Provides helpers to start a new log, record actions and read back the
 * immutable list of actions for persistence or analysis.
 */
export declare class AuditLogger {
    private actions;
    private startTs;
    private seed;
    private rake;
    /** Reset the logger for a new hand */
    startHand(deckSeed: string): void;
    /** Record a hand action with the elapsed time since hand start */
    record(playerId: string, round: Round, action: PlayerAction, amount?: number): void;
    /** Record total rake taken for the hand */
    recordRake(amount: number): void;
    /** Return a read-only view of the logged actions */
    get handActions(): readonly HandAction[];
    get deckSeed(): string;
    get totalRake(): number;
}
export default AuditLogger;
