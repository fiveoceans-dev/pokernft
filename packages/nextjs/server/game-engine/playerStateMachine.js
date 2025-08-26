"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerStateReducer = playerStateReducer;
const types_1 = require("./types");
/**
 * Reduce player state based on gameplay events.
 * This encapsulates the per-hand state machine defined in the docs.
 */
function playerStateReducer(state, event) {
    switch (event.type) {
        case "NEW_HAND": {
            if (event.sittingOut)
                return types_1.PlayerState.SITTING_OUT;
            const min = event.minToPlay ?? event.bigBlind;
            return event.stack >= min ? types_1.PlayerState.ACTIVE : types_1.PlayerState.SITTING_OUT;
        }
        case "FOLD":
            return state === types_1.PlayerState.ACTIVE || state === types_1.PlayerState.DISCONNECTED
                ? types_1.PlayerState.FOLDED
                : state;
        case "BET_ALL_IN":
            return state === types_1.PlayerState.ACTIVE ? types_1.PlayerState.ALL_IN : state;
        case "DISCONNECT":
            return state === types_1.PlayerState.ACTIVE ? types_1.PlayerState.DISCONNECTED : state;
        case "RECONNECT":
            return state === types_1.PlayerState.DISCONNECTED ? types_1.PlayerState.ACTIVE : state;
        case "HAND_END":
            if (state === types_1.PlayerState.LEAVING) {
                return types_1.PlayerState.EMPTY;
            }
            if (event.stack === 0) {
                return event.reBuyAllowed
                    ? types_1.PlayerState.SITTING_OUT
                    : types_1.PlayerState.LEAVING;
            }
            return state;
        case "LEAVE":
            return types_1.PlayerState.LEAVING;
        default:
            return state;
    }
}
//# sourceMappingURL=playerStateMachine.js.map