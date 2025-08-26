import { Table, Player } from "./types";
/**
 * SeatingManager handles seat assignment, buy-ins, sit-out/return and leaving.
 * It also removes players with zero stacks or marks them sitting out when
 * re-buy is permitted.
 */
export declare class SeatingManager {
    private table;
    constructor(table: Table);
    /** Seat a new player at the given index. Returns the created player or null. */
    seatPlayer(seatIndex: number, id: string, stack: number): Player | null;
    /** Increase a player's stack up to the table's max buy-in. */
    topUp(seatIndex: number, amount: number): boolean;
    /** Mark a player as sitting out. */
    sitOut(seatIndex: number, remove?: boolean): void;
    /** Return a sitting out player to active play if they have chips. */
    sitIn(seatIndex: number): void;
    /** Remove a player entirely from the table. */
    leave(seatIndex: number): void;
    /** Remove or mark players with zero chips depending on re-buy rules. */
    removeBrokePlayers(reBuyAllowed: boolean): void;
}
export default SeatingManager;
