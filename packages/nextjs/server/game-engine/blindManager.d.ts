import { GameRoom, Table } from "./types";
/**
 * BlindManager computes small/big blind positions and posts the blinds.
 * It assumes `room.minBet` represents the big blind and deducts the
 * corresponding amounts from each player.
 */
export declare class BlindManager {
    private smallBlind;
    private bigBlind;
    constructor(smallBlind: number, bigBlind: number);
    /** Return the indices for small and big blinds */
    getBlindIndices(room: GameRoom): {
        sb: number;
        bb: number;
    };
    /** Post blinds to the pot and update player bets */
    postBlinds(room: GameRoom): {
        sb: number;
        bb: number;
    };
    /** Find the next active player index starting from `start` */
    nextActiveIndex(room: GameRoom, start: number): number;
}
/** Move the dealer button to the next active seat clockwise */
export declare function advanceButton(table: Table): void;
/**
 * Assign button, small blind and big blind for a {@link Table} and attempt to
 * post the blinds according to player stacks. Returns `true` when both blinds
 * were posted successfully, otherwise `false` indicating the hand cannot
 * start.
 */
export declare function assignBlindsAndButton(table: Table): boolean;
