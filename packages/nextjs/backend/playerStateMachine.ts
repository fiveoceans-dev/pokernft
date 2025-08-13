import { PlayerState } from './types';

export type PlayerEvent =
  | { type: 'NEW_HAND'; stack: number; bigBlind: number; sittingOut: boolean }
  | { type: 'FOLD' }
  | { type: 'BET_ALL_IN' }
  | { type: 'DISCONNECT' }
  | { type: 'RECONNECT' }
  | { type: 'STACK_DEPLETED' }
  | { type: 'LEAVE' };

/**
 * Reduce player state based on gameplay events.
 * This encapsulates the per-hand state machine defined in the docs.
 */
export function playerStateReducer(
  state: PlayerState,
  event: PlayerEvent,
): PlayerState {
  switch (event.type) {
    case 'NEW_HAND': {
      if (event.sittingOut) return PlayerState.SITTING_OUT;
      if (event.stack >= event.bigBlind || event.stack > 0) {
        return PlayerState.ACTIVE;
      }
      return PlayerState.SITTING_OUT;
    }
    case 'FOLD':
      return state === PlayerState.ACTIVE ? PlayerState.FOLDED : state;
    case 'BET_ALL_IN':
      return state === PlayerState.ACTIVE ? PlayerState.ALL_IN : state;
    case 'DISCONNECT':
      return state === PlayerState.ACTIVE ? PlayerState.DISCONNECTED : state;
    case 'RECONNECT':
      return state === PlayerState.DISCONNECTED ? PlayerState.ACTIVE : state;
    case 'STACK_DEPLETED':
      return PlayerState.SITTING_OUT;
    case 'LEAVE':
      return PlayerState.LEAVING;
    default:
      return state;
  }
}
