import { Table, PlayerState } from './types';

export interface EndOfHandOptions {
  /** Whether players may buy back in after busting */
  rebuyAllowed: boolean;
  /** Minimum stack required to be dealt in (defaults to big blind) */
  minToPlay: number;
}

/**
 * Apply end-of-hand transitions for players based on stack and intent.
 * - Players marked LEAVING are removed from the table.
 * - Players with zero chips either sit out for rebuy or leave entirely.
 * - Players who toggled sit-out become SITTING_OUT for the next hand.
 */
export function handleEndOfHand(
  table: Table,
  opts: EndOfHandOptions,
): void {
  table.seats = table.seats.map((p) => {
    if (!p) return null;

    // Remove players who chose to leave during the hand
    if (p.state === PlayerState.LEAVING) return null;

    // Zero-stack handling
    if (p.stack <= 0) {
      if (opts.rebuyAllowed) {
        p.state = PlayerState.SITTING_OUT;
        return p;
      }
      return null; // bust without rebuy
    }

    // Voluntary sit-out after hand
    if (p.sitOutNextHand) {
      p.state = PlayerState.SITTING_OUT;
      p.sitOutNextHand = false;
    }

    // Ensure players below minimum to play sit out
    if (p.stack < opts.minToPlay) {
      p.state = PlayerState.SITTING_OUT;
    }

    return p;
  });
}

