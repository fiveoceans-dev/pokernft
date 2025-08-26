import { TableState } from "./types";
export type TableEvent = {
    type: "START_HAND";
    activeSeats: number;
} | {
    type: "BLINDS_POSTED";
} | {
    type: "DEALING_COMPLETE";
} | {
    type: "BETTING_COMPLETE";
    remainingPlayers: number;
} | {
    type: "SHOWDOWN_COMPLETE";
} | {
    type: "PAYOUT_COMPLETE";
} | {
    type: "ROTATION_COMPLETE";
} | {
    type: "CLEANUP_COMPLETE";
    activeSeats: number;
};
/**
 * Basic finite state machine for a poker table. It advances through the
 * canonical sequence of states for a single hand.
 */
export declare class TableStateMachine {
    state: TableState;
    dispatch(event: TableEvent): void;
}
