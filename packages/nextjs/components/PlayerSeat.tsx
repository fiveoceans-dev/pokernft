// src/components/PlayerSeat.tsx

import clsx from "clsx";
import Card from "./Card";
import type { Player, Card as TCard } from "../game/types";

interface PlayerSeatProps {
  player: Player; // player object from your Zustand store
  isDealer?: boolean; // show “D” marker if true
  isActive?: boolean; // highlight border when it's this player's turn
  bet?: number; // amount currently bet by this player
  revealCards?: boolean; // if true, show hole cards face-up
  cardSize?: "xs" | "sm" | "md" | "lg"; // size of player's hole cards
  dealerOffset?: { x: number; y: number }; // offset dealer button toward centre
}

export default function PlayerSeat({
  player,
  isDealer = false,
  isActive = false,
  bet = 0,
  revealCards = false,
  cardSize = "lg",
  dealerOffset = { x: 0, y: -20 },
}: PlayerSeatProps) {
  // If `player.hand` is null, treat as not yet dealt
  const [hole1, hole2]: [TCard | null, TCard | null] = player.hand ?? [
    null,
    null,
  ];

  return (
    <div
      className={clsx(
        "relative w-24 h-8",

        player.folded && "opacity-60",
        isActive && "ring-4 ring-amber-300 rounded-lg",
      )}
    >
      {/* Dealer marker */}
      {isDealer && (
        <span
          className="absolute left-1/2 top-1/2 w-6 h-6 rounded-full bg-accent text-black text-xs font-bold flex items-center justify-center"
          style={{
            transform: `translate(-50%, -50%) translate(${dealerOffset.x}px, ${dealerOffset.y}px)`,
          }}
        >
          D
        </span>
      )}

      {/* Pocket cards positioned above the seat */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex gap-2"
        style={{ bottom: "100%", marginBottom: "0.5rem" }}
      >
        <Card card={hole1} hidden={!revealCards} size={cardSize} />
        <Card card={hole2} hidden={!revealCards} size={cardSize} />
      </div>

      {/* Player name box */}
      <div className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-white font-semibold text-center truncate px-1">
        {player.name}
      </div>

      {/* Chip count and bet below name */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
        style={{ top: "100%", marginTop: "0.25rem" }}
      >
        <div className="text-sm text-white">{`$${player.chips}`}</div>
        {bet > 0 && (
          <div className="mt-1 px-2 py-0.5 bg-green-700 rounded text-xs text-white">
            Bet {bet}
          </div>
        )}
      </div>

    </div>
  );
}
