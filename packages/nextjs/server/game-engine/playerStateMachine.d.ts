import { PlayerState } from "./types";
export type PlayerEvent = {
    type: "NEW_HAND";
    stack: number;
    bigBlind: number;
    sittingOut: boolean;
    /** Minimum stack required to be dealt in. Defaults to big blind. */
    minToPlay?: number;
} | {
    type: "FOLD";
} | {
    type: "BET_ALL_IN";
} | {
    type: "DISCONNECT";
} | {
    type: "RECONNECT";
} | {
    type: "HAND_END";
    stack: number;
    reBuyAllowed: boolean;
} | {
    type: "LEAVE";
};
/**
 * Reduce player state based on gameplay events.
 * This encapsulates the per-hand state machine defined in the docs.
 */
export declare function playerStateReducer(state: PlayerState, event: PlayerEvent): PlayerState;
