import { Table } from "./types";
/**
 * Reset per-hand table and player fields after a hand finishes and
 * optionally transition to the next hand if enough players remain.
 */
export declare function resetTableForNextHand(table: Table, reBuyAllowed?: boolean): Promise<void>;
declare const _default: {
    resetTableForNextHand: typeof resetTableForNextHand;
};
export default _default;
