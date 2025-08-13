// src/components/PlayerSeat.tsx

import clsx from "clsx";
import Card from "./Card";
import type { Player, Card as TCard } from "../backend";

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
  cardSize = "sm",
  dealerOffset = { x: 0, y: -20 },
}: PlayerSeatProps) {
  // If `player.hand` is null, treat as not yet dealt
  const [hole1, hole2]: [TCard | null, TCard | null] = player.hand ?? [
    null,
    null,
  ];

  return (
    <div
      className={clsx("relative w-24 h-8", player.folded && "opacity-60")}
    >
      {/* Hole cards positioned above the seat box without shifting it */}
      <div
        className="absolute w-full flex justify-center gap-1"
        style={{ bottom: "150%", marginBottom: "0.5rem" }}
      >
        <Card card={hole1} hidden={!revealCards} size={cardSize} />
        <Card card={hole2} hidden={!revealCards} size={cardSize} />
      </div>

      {/* Seat box with player name */}
      <div
        className={clsx(
          "relative w-full h-full",
          isActive && "animate-pulse",
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

      <div
        className={clsx(
          "absolute inset-0 flex items-center justify-center rounded border font-semibold text-center truncate px-1 transition-colors",
          isActive
            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
            : "bg-black/60 border-gray-500 hover:bg-red-500 hover:border-red-500",
        )}
      >
        <span className="text-[var(--color-highlight)]">{player.name}</span>
      </div>
      </div>

      {/* Bet displayed below the seat */}
      {bet > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-700 rounded text-xs text-white"
          style={{ top: "100%", marginTop: "0.25rem" }}
        >
          Bet {bet}
        </div>
      )}
    </div>
  );
}
