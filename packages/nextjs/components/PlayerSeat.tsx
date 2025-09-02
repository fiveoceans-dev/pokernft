// src/components/PlayerSeat.tsx

import clsx from "clsx";
import Card from "./Card";
import type { Card as TCard, SeatUIState } from "../game-engine";
import { shortAddress } from "../utils/address";
import { GlowEffect } from "./GlowEffect";

interface PlayerSeatProps {
  player: {
    name: string;
    address: string;
    chips: number;
    hand: [TCard, TCard] | null;
    folded: boolean;
    currentBet: number;
  }; // player object from your Zustand store
  isDealer?: boolean; // show “D” marker if true
  isActive?: boolean; // highlight border when it's this player's turn
  revealCards?: boolean; // if true, show hole cards face-up
  cardSize?: "xs" | "sm" | "md" | "lg"; // size of player's hole cards
  dealerOffset?: { x: number; y: number }; // offset dealer button toward centre
  state?: SeatUIState; // include UI-only sittingOut state
  isWinner?: boolean; // show sparkle effect if true
  actionLabel?: string; // dynamic action label (Check, Bet $40, etc.)
}

export default function PlayerSeat({
  player,
  isDealer = false,
  isActive = false,
  revealCards = false,
  cardSize = "sm",
  dealerOffset = { x: 0, y: -20 },
  state = "active",
  isWinner = false,
  actionLabel,
}: PlayerSeatProps) {
  // If `player.hand` is null, we still may show card backs for opponents
  const [hole1, hole2]: [TCard | null, TCard | null] = player.hand ?? [
    null,
    null,
  ];

  const isPlaceholderAddress = (addr: string) =>
    addr.toLowerCase() === "white" || /^0x0{40}$/.test(addr);

  const displayName = player.name?.trim()
    ? player.name
    : player.address && !isPlaceholderAddress(player.address)
      ? shortAddress(player.address)
      : "";

  return (
    <div className={clsx("relative w-24 h-8", player.folded && "opacity-60")}>
      {/* Hole cards/back-of-cards display */}
      {/* Render if cards dealt - show backs for opponents, faces when revealed */}
      {player.hand && (
        <div
          className="absolute w-full flex justify-center gap-1"
          style={{ bottom: "150%", marginBottom: "0.5rem" }}
        >
          {/* Show faces only when revealCards is true; otherwise render backs */}
          <Card card={hole1} hidden={!revealCards} size={cardSize} />
          <Card card={hole2} hidden={!revealCards} size={cardSize} />
        </div>
      )}

      {/* Seat box with player name */}
      <div
        className={clsx("relative w-full h-full", isActive && "animate-pulse")}
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

        <GlowEffect isActive={isWinner}>
          <div
            className={clsx(
              "absolute inset-0 flex flex-col items-center justify-center rounded border font-semibold text-center px-1 transition-colors",
              isActive
                ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                : state === "active"
                  ? "bg-gray-700/80 border-gray-400 opacity-60"
                  : "bg-black/60 border-gray-500 hover:bg-red-500 hover:border-red-500",
            )}
          >
            <span className="text-[var(--color-highlight)] truncate w-full text-xs">
              {displayName}
            </span>
          </div>
        </GlowEffect>
        {/* Professional action label with proper priority */}
        {(() => {
          // Priority 1: Always show action label if it exists (regardless of state)
          if (actionLabel) {
            const color = actionLabel.toLowerCase().includes("all")
              ? "text-yellow-300"
              : actionLabel.toLowerCase() === "fold"
                ? "text-gray-400"
                : "text-blue-300";
            return (
              <span
                className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap transition-all duration-200 ${color}`}
              >
                {actionLabel}
              </span>
            );
          }

          // Priority 2: Only show state labels when no action taken
          if (state === "sittingOut") {
            return (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap transition-all duration-200 text-orange-300">
                Sitting Out
              </span>
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
}
