import { Table } from "./types";
import { AuditLogger } from "./auditLogger";
/**
 * Attempt to start a new hand by posting blinds, shuffling and
 * dealing hole cards. Returns `true` on success, otherwise
 * `false` when the hand cannot begin (e.g. not enough active
 * players or blinds could not be posted).
 */
export declare function startTableHand(table: Table, audit?: AuditLogger): boolean;
/**
 * Resolve the current hand by awarding pots or, if only a single
 * player remains, giving them the entire pot. Afterwards the table
 * is reset for the next hand or returned to the waiting state.
 */
export declare function endHand(table: Table, audit?: AuditLogger): Promise<void>;
