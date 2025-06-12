// src/components/PlayerSeat.tsx

import clsx from "clsx";
import Card from "./Card";
import type { Player, CardShape } from "../game/types";

interface PlayerSeatProps {
  player: Player;       // player object from your Zustand store
  isDealer?: boolean;   // show “D” marker if true
  isActive?: boolean;   // highlight border when it's this player's turn
  bet?: number;         // amount currently bet by this player
  revealCards?: boolean;// if true, show hole cards face-up
}

/**
 * Helper: convert a numeric code [0..51] into a CardShape { rank, suit }.
 * rank = 0..12  (2..Ace), suit = 0..3 (Spade, Heart, Diamond, Club)
 */
function makeCardShape(code: number): CardShape {
  return {
    rank: code % 13,
    suit: Math.floor(code / 13),
  };
}

export default function PlayerSeat({
  player,
  isDealer = false,
  isActive = false,
  bet = 0,
  revealCards = false,
}: PlayerSeatProps) {
  // If `player.hand` is null, treat as not yet dealt
  let hole1: CardShape | null = null;
  let hole2: CardShape | null = null;
  if (player.hand) {
    const [code1, code2] = player.hand;
    hole1 = code1 !== null ? makeCardShape(code1) : null;
    hole2 = code2 !== null ? makeCardShape(code2) : null;
  }

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center gap-1",
        player.folded && "opacity-60",
        isActive && "ring-4 ring-amber-300 rounded-lg"
      )}
    >
      {/* Dealer marker */}
      {isDealer && (
        <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">
          D
        </span>
      )}

      {/* Pocket cards */}
      <div className="flex gap-2">
        <Card card={hole1} hidden={!revealCards} size="lg" />
        <Card card={hole2} hidden={!revealCards} size="lg" />
      </div>

      {/* Player name and chip count */}
      <div className="text-center text-white">
        <div className="font-semibold truncate max-w-[100px]">
          {player.name}
        </div>
        <div className="text-sm">{player.chips} chips</div>
      </div>

      {/* Current bet */}
      {bet > 0 && (
        <div className="mt-0.5 px-2 py-0.5 bg-green-700 rounded text-xs text-white">
          Bet {bet}
        </div>
      )}
    </div>
  );
}
