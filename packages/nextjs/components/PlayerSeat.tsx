// src/components/PlayerSeat.tsx

import clsx from "clsx";
import Card from "./Card";
import type { Card as TCard, SeatUIState } from "../game-engine";
import { shortAddress } from "../utils/address";
import { GlowEffect } from "./GlowEffect";
import type { SeatState } from "../stores/seatStore";

interface PlayerSeatProps {
  seat?: SeatState;
  status?: SeatUIState;
  hand?: [TCard, TCard] | "encrypted" | null;
  isDealer?: boolean;
  isActive?: boolean;
  revealCards?: boolean;
  cardSize?: "xs" | "sm" | "md" | "lg";
  dealerOffset?: { x: number; y: number };
  isWinner?: boolean;
  actionLabel?: string;
}

export default function PlayerSeat({
  seat,
  status = "active",
  hand = null,
  isDealer = false,
  isActive = false,
  revealCards = false,
  cardSize = "sm",
  dealerOffset = { x: 0, y: -20 },
  isWinner = false,
  actionLabel,
}: PlayerSeatProps) {
  const hasEncryptedCards = hand === "encrypted";
  const [hole1, hole2]: [TCard | null, TCard | null] = hasEncryptedCards
    ? [null, null]
    : Array.isArray(hand)
      ? hand
      : [null, null];

  const isPlaceholderAddress = (addr: string) =>
    addr.toLowerCase() === "white" || /^0x0{40}$/.test(addr);

  const displayName = seat?.name?.trim()
    ? seat.name
    : seat?.playerId && !isPlaceholderAddress(seat.playerId)
      ? shortAddress(seat.playerId)
      : "—";

  return (
    <div
      className={clsx(
        "relative w-24 h-8",
        status === "folded" && "opacity-60",
        status === "empty" && "opacity-50",
      )}
    >
      {hand && hand !== null && (
        <div
          className="absolute w-full flex justify-center gap-1"
          style={{ bottom: "150%", marginBottom: "0.5rem" }}
        >
          <Card
            card={hole1}
            hidden={!revealCards || hasEncryptedCards}
            size={cardSize}
          />
          <Card
            card={hole2}
            hidden={!revealCards || hasEncryptedCards}
            size={cardSize}
          />
        </div>
      )}

      <div
        className={clsx("relative w-full h-full", isActive && "animate-pulse")}
      >
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
                : status === "active"
                  ? "bg-gray-700/80 border-gray-400 opacity-60"
                  : status === "empty"
                    ? "bg-black/20 border-gray-600"
                    : "bg-black/60 border-gray-500 hover:bg-red-500 hover:border-red-500",
            )}
          >
            <span className="text-[var(--color-highlight)] truncate w-full text-xs">
              {displayName}
            </span>
          </div>
        </GlowEffect>
        {(() => {
          if (actionLabel) {
            const lower = actionLabel.toLowerCase();
            const color = lower.includes("all")
              ? "text-yellow-300"
              : lower === "fold"
                ? "text-gray-400"
                : lower === "winner"
                  ? "text-yellow-300"
                  : "text-blue-300";
            return (
              <span
                className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap transition-all duration-200 ${color}`}
              >
                {actionLabel}
              </span>
            );
          }

          if (status === "sittingOut") {
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
