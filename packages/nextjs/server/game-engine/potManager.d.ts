import { Table } from "./types";
/**
 * Rebuild main and side pots based on each player's total commitment.
 * Players are grouped into contribution tiers and each tier forms a pot
 * consisting of the incremental commitments of all players who reached it.
 */
export declare function rebuildPots(table: Table): void;
/**
 * Reset per-round betting state for a new betting round. Total commitment is
 * preserved while individual round bets and bet-to-call are cleared.
 */
export declare function resetForNextRound(table: Table): void;
/**
 * Apply rake to each pot if a rake configuration is present on the table.
 * Returns the total rake taken across all pots.
 */
export declare function applyRake(table: Table): number;
/**
 * Distribute chips from all pots to the winning players. Each pot considers
 * only its eligible seats and ignores folded players. Hands are ranked using
 * {@link rankHand} and ties are split evenly with any remainder awarded
 * clockwise from the dealer button. Players who end up with zero chips are
 * marked {@link PlayerState.SITTING_OUT}.
 */
export declare function awardPots(table: Table): void;
declare const _default: {
    rebuildPots: typeof rebuildPots;
    resetForNextRound: typeof resetForNextRound;
    applyRake: typeof applyRake;
    awardPots: typeof awardPots;
};
export default _default;
