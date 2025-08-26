import { Table, PlayerAction, Round } from "./types";
import { AuditLogger } from "./auditLogger";
import { BettingActionRequest, BettingActionResponse } from "./jsonFormats";
/** Initialize betting round and determine first to act */
export declare function startBettingRound(table: Table, round: Round): void;
/** Process a player's action, enforcing betting rules */
export declare function applyAction(table: Table, seatIndex: number, action: {
    type: PlayerAction;
    amount?: number;
}, audit?: AuditLogger): void;
export declare function applyActionFromJson(req: BettingActionRequest): BettingActionResponse;
/** Determine if betting round is complete */
export declare function isBettingRoundComplete(table: Table): boolean;
