import { PlayerState } from "./types";

export type PlayerEvent =
  | {
      type: "NEW_HAND";
      stack: number;
      bigBlind: number;
      sittingOut: boolean;
      /** Minimum stack required to be dealt in. Defaults to big blind. */
      minToPlay?: number;
    }
  | { type: "FOLD" }
  | { type: "BET_ALL_IN" }
  | { type: "DISCONNECT" }
  | { type: "RECONNECT" }
  | { type: "HAND_END"; stack: number; reBuyAllowed: boolean }
  | { type: "LEAVE" };

/**
 * Reduce player state based on gameplay events.
 * This encapsulates the per-hand state machine defined in the docs.
 */
export function playerStateReducer(
  state: PlayerState,
  event: PlayerEvent,
): PlayerState {
  switch (event.type) {
    case "NEW_HAND": {
      if (event.sittingOut) return PlayerState.SITTING_OUT;
      const min = event.minToPlay ?? event.bigBlind;
      return event.stack >= min ? PlayerState.ACTIVE : PlayerState.SITTING_OUT;
    }
    case "FOLD":
      return state === PlayerState.ACTIVE || state === PlayerState.DISCONNECTED
        ? PlayerState.FOLDED
        : state;
    case "BET_ALL_IN":
      return state === PlayerState.ACTIVE ? PlayerState.ALL_IN : state;
    case "DISCONNECT":
      return state === PlayerState.ACTIVE ? PlayerState.DISCONNECTED : state;
    case "RECONNECT":
      return state === PlayerState.DISCONNECTED ? PlayerState.ACTIVE : state;
    case "HAND_END":
      if (state === PlayerState.LEAVING) {
        return PlayerState.EMPTY;
      }
      if (event.stack === 0) {
        return event.reBuyAllowed
          ? PlayerState.SITTING_OUT
          : PlayerState.LEAVING;
      }
      return state;
    case "LEAVE":
      return PlayerState.LEAVING;
    default:
      return state;
  }
}
