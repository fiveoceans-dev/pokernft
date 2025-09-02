// src/components/Table.tsx

import { Fragment } from "react";
import type { CSSProperties } from "react";
import { useTableViewModel } from "../hooks/useTableViewModel";
import { useGameStore } from "../hooks/useGameStore";
import Card from "./Card";
import { hashIdToCard } from "../game-engine";
import PlayerSeat from "./PlayerSeat";
import type { Card as TCard } from "../game-engine";
import { useWalletGameSync } from "../hooks/useWalletGameSync";
import { PotDisplayBubbles } from "./PotDisplayBubbles";
import useIsMobile from "../hooks/useIsMobile";
import { useCountdownWithPriority } from "../hooks/useCountdown";

/* ─────────────────────────────────────────────────────── */

export default function Table({ timer }: { timer?: number | null }) {
  const {
    players,
    playerIds,
    playerHands,
    community,
    joinSeat,
    bigBlind,
    chips,
    currentTurn,
    playerBets,
    playerStates,
    layout,
    walletSeatIdx,
    tableScale,
    bet,
    setBet,
    communityCardSize,
    baseW,
    baseH,
    actions,
    betEnabled,
    maxBet,
    displayTimer,
    localIdx,
    actionDisabled,
    handleActionClick,
    dealerIndex,
    currentRoundBetting,
  } = useTableViewModel(timer);

  const gameStore = useGameStore();
  const street = gameStore.street || 0; // Get street from game store, default to 0
  const totalPot = gameStore.pot;
  const cardsRevealed = gameStore.cardsRevealed;
  const revealCards = gameStore.revealCards;
  const recentWinners = gameStore.recentWinners;
  const lastActionLabels = gameStore.lastActionLabels;
  const { isConnected, address } = useWalletGameSync();
  const isMobile = useIsMobile();

  // Use new client-driven countdown system
  const countdownInfo = useCountdownWithPriority(gameStore.countdowns);

  // Debug logging for player data
  console.log("🎲 Table component debug:", {
    playersCount: players.filter((p) => p).length,
    players: players
      .map((p, i) => ({ seat: i, name: p }))
      .filter((p) => p.name),
    playerIds: playerIds
      .map((id, i) => ({ seat: i, id: id?.slice(0, 10) + "..." }))
      .filter((p) => p.id && p.id !== "undefined..."),
    chips: chips
      .map((c, i) => ({ seat: i, chips: c }))
      .filter((c) => c.chips > 0),
    currentTurn,
    dealerIndex,
    displayTimer,
  });

  const handleSeatRequest = (idx: number) => {
    if (!isConnected || !address) {
      // Show wallet connect modal
      const modal = document.getElementById(
        "connect-modal",
      ) as HTMLInputElement | null;
      if (modal) modal.checked = true;
      return;
    }

    // Enhanced address validation - ensure navbar address matches game store
    const gameStoreAddress = gameStore.currentWalletId;
    const storedAddress =
      typeof window !== "undefined"
        ? localStorage.getItem("walletAddress")
        : null;

    console.log("🔍 Address validation for seating:", {
      navbarAddress: address.slice(0, 10) + "...",
      gameStoreAddress: gameStoreAddress?.slice(0, 10) + "..." || "null",
      storedAddress: storedAddress?.slice(0, 10) + "..." || "null",
    });

    // Priority validation: navbar address should match game store and localStorage
    if (gameStoreAddress !== address) {
      console.warn("🚫 Address mismatch: navbar vs game store", {
        navbar: address,
        gameStore: gameStoreAddress,
      });
      alert("Wallet address mismatch detected. Please reconnect your wallet.");
      return;
    }

    if (storedAddress !== address) {
      console.warn("🚫 Address mismatch: navbar vs localStorage", {
        navbar: address,
        stored: storedAddress,
      });
      alert("Wallet address mismatch detected. Please reconnect your wallet.");
      return;
    }

    // Prevent seating if this wallet is already seated at the table
    if (playerIds.some((id) => id?.toLowerCase() === address.toLowerCase())) {
      alert("You are already seated at this table");
      return;
    }

    // Additional validation: check if any other address variants are seated
    if (
      gameStoreAddress &&
      playerIds.some(
        (id) =>
          id &&
          id.toLowerCase() === gameStoreAddress.toLowerCase() &&
          id.toLowerCase() !== address.toLowerCase(),
      )
    ) {
      console.warn("🚫 Different address variant already seated", {
        seated: gameStoreAddress,
        requesting: address,
      });
      alert(
        "A different variant of your wallet address is already seated. Please refresh the page.",
      );
      return;
    }

    console.log(
      "✅ Address validation passed, joining seat",
      idx,
      "with address:",
      address.slice(0, 10) + "...",
    );
    // Join seat using the validated address
    joinSeat(idx);
  };

  // The table is always visible; wallet connections are handled elsewhere.

  const holeCardSize = "sm";

  /* helper – calculate position along oval border from seat toward center */
  const getOvalPosition = (
    seatPos: { x: string; y: string },
    percentage: number,
  ) => {
    // Parse seat position percentages
    const seatX = parseFloat(seatPos.x);
    const seatY = parseFloat(seatPos.y);

    // Center is at 50%, 50%
    const centerX = 50;
    const centerY = 50;

    // Calculate direction vector from seat to center
    const dx = centerX - seatX;
    const dy = centerY - seatY;

    // Apply percentage along the line from seat toward center
    const targetX = seatX + (dx * percentage) / 100;
    const targetY = seatY + (dy * percentage) / 100;

    return { x: targetX, y: targetY };
  };

  /* helper – render a seat or an empty placeholder */
  const seatAt = (idx: number) => {
    let nickname = players[idx] ?? "";
    const addr = playerIds[idx];
    // If we have a wallet address, show shortened version for display
    if (nickname && /^0x[a-fA-F0-9]{40,}$/.test(nickname)) {
      nickname = `${nickname.slice(0, 6)}...${nickname.slice(-4)}`;
    }
    const handCodes = playerHands[idx];
    const pos = layout[idx];
    if (!pos) return null;
    const posStyle = {
      left: pos.x,
      top: pos.y,
      transform: `translate(${pos.t})`,
    } as CSSProperties;

    // Position dealer button at 40% from seat toward center (20% closer than chips)
    const dealerPosition = getOvalPosition(pos, 40);
    const dealerOffset = {
      x: (dealerPosition.x - parseFloat(pos.x)) * (baseW / 100),
      y: (dealerPosition.y - parseFloat(pos.y)) * (baseH / 100),
    };
    /* ── empty seat → button ─────────────────────────────── */
    if (!nickname) {
      const badge = (
        <span
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full
                    bg-black/60 text-white text-xs flex items-center justify-center
                    pointer-events-none"
        >
          {idx + 1}
        </span>
      );
      return (
        <div key={idx} style={posStyle} className="absolute">
          <div>
            {badge}
            <button
              onClick={() => handleSeatRequest(idx)}
              className="w-24 h-8 flex items-center justify-center rounded text-xs text-gray-300 border border-dashed border-gray-500 bg-black/20 transition-colors duration-150 hover:bg-red-500 hover:text-white"
            >
              Play
            </button>
          </div>
        </div>
      );
    }

    /* ── occupied seat ───────────────────────────────────── */
    const hand: [TCard, TCard] | null = handCodes
      ? [hashIdToCard(handCodes[0]), hashIdToCard(handCodes[1])]
      : null;
    const state = playerStates[idx];
    // TODO: visually mark auto-folded players (Action Plan 1.2)
    const player = {
      name: nickname,
      address: addr ?? "",
      chips: chips[idx] ?? 0,
      hand,
      folded: state === "folded",
      currentBet: playerBets[idx] ?? 0,
    };
    const isDealer = idx === dealerIndex;
    const isActive = idx === currentTurn;
    const isWinner = recentWinners.has(idx);
    // Reveal rules:
    // - Own seat: always reveal own cards once dealt (professional poker UX)
    // - Winners or players who opted to reveal: cardsRevealed[idx] set by store
    // - Auto-reveal at showdown: still controlled by autoRevealAtShowdown
    const isOwnSeat = idx === walletSeatIdx;
    const revealOwn = isOwnSeat && hand !== null; // Always show own cards if dealt
    const reveal = cardsRevealed[idx] || revealOwn;

    const badge = (
      <span
        className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-20 px-2 rounded-full
                  bg-black/60 text-white text-xs flex items-center justify-center
                  font-mono tabular-nums whitespace-nowrap pointer-events-none"
      >
        {/* show bet if you prefer: `$${player.currentBet}` */}
        {`$${player.chips.toLocaleString()}`}
      </span>
    );

    // Position chips at 30% from seat toward center (on oval border)
    const chipPosition = getOvalPosition(pos, 30);
    const betStyle = {
      left: `${chipPosition.x}%`,
      top: `${chipPosition.y}%`,
      transform: "translate(-50%, -50%)",
    } as CSSProperties;
    const betAmount = player.currentBet ?? 0;
    // Color-code bet chip based on size relative to big blind for consistency across stakes
    const getBetChipColor = (amt: number, bb: number | undefined) => {
      const base = Math.max(1, bb || 1);
      const x = amt / base;
      if (x >= 50) return "bg-orange-600"; // 50bb+
      if (x >= 25) return "bg-purple-600"; // 25–49bb
      if (x >= 10) return "bg-black"; // 10–24bb
      if (x >= 5) return "bg-blue-600"; // 5–9bb
      if (x >= 2) return "bg-red-600"; // 2–4bb
      if (x > 0) return "bg-green-600"; // <2bb
      return "bg-gray-500"; // no bet
    };
    const betBg = getBetChipColor(betAmount, bigBlind);

    // Calculate blind positions (SB = dealer + 1, BB = dealer + 2 for multi-way games)
    const totalPlayers = players.filter((p) => p).length;
    const isSmallBlind =
      totalPlayers > 2 &&
      dealerIndex !== null &&
      (dealerIndex + 1) % players.length === idx;
    const isBigBlind =
      totalPlayers > 2 &&
      dealerIndex !== null &&
      (dealerIndex + 2) % players.length === idx;
    // For heads-up, dealer is SB
    const isHeadsUpSmallBlind =
      totalPlayers === 2 && dealerIndex !== null && dealerIndex === idx;
    const isHeadsUpBigBlind =
      totalPlayers === 2 &&
      dealerIndex !== null &&
      (dealerIndex + 1) % players.length === idx;

    return (
      <Fragment key={idx}>
        <div style={posStyle} className="absolute">
          <div className="relative">
            {badge}
            <div style={{ transform: `rotate(${pos.r}deg)` }}>
              <PlayerSeat
                player={player}
                isDealer={isDealer}
                isActive={isActive}
                revealCards={reveal}
                cardSize={holeCardSize}
                dealerOffset={dealerOffset}
                state={state}
                isWinner={isWinner}
                actionLabel={lastActionLabels[idx] || undefined}
              />
            </div>
          </div>
        </div>
        {betAmount > 0 && (
          <div
            style={betStyle}
            className={`absolute w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs text-white font-semibold ${betBg}`}
          >
            ${betAmount}
          </div>
        )}
        {/* Small Blind marker */}
        {(isSmallBlind || isHeadsUpSmallBlind) && (
          <div
            style={{
              left: `${chipPosition.x}%`,
              top: `${chipPosition.y}%`,
              transform: "translate(-50%, -50%) translate(-12px, -12px)",
            }}
            className="absolute w-4 h-4 rounded-full bg-blue-600 border border-white flex items-center justify-center text-xs text-white font-bold pointer-events-none z-30"
          >
            SB
          </div>
        )}
        {/* Big Blind marker */}
        {(isBigBlind || isHeadsUpBigBlind) && (
          <div
            style={{
              left: `${chipPosition.x}%`,
              top: `${chipPosition.y}%`,
              transform: "translate(-50%, -50%) translate(12px, -12px)",
            }}
            className="absolute w-4 h-4 rounded-full bg-orange-600 border border-white flex items-center justify-center text-xs text-white font-bold pointer-events-none z-30"
          >
            BB
          </div>
        )}
      </Fragment>
    );
  };

  // BANK element removed - replaced with pot display bubbles

  /* community cards – only reveal dealt streets */
  const visibleCommunity = community.filter((c): c is number => c !== null);
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center w-full">
      <div className="relative">
        {/* Centered concentric oval, same shape as table (rounded-full), sized as a fraction of table */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent z-10 pointer-events-none"
          style={{ width: "110%", height: "180%" }}
        />
        {/* Cards above the oval */}
        <div className="relative z-20 flex items-center gap-2 px-4">
          {visibleCommunity.map((code, i) => (
            <Card key={i} card={hashIdToCard(code)} size={communityCardSize} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      {/* Client-driven countdown display with priority handling */}
      {countdownInfo.timeLeft !== null && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 translate-y-10 text-3xl font-mono text-white bg-black/50 px-3 py-1 rounded z-50">
          <div className="text-center">
            <div className="text-3xl">
              {countdownInfo.timeLeft.toString().padStart(2, "0")}
            </div>
            {countdownInfo.activeType && (
              <div className="text-xs opacity-75 mt-1">
                {countdownInfo.activeType === "game_start" && "Game Starting"}
                {countdownInfo.activeType === "action" && "Action Timer"}
                {countdownInfo.activeType === "street_deal" && "Dealing Cards"}
                {countdownInfo.activeType === "new_hand" && "New Hand"}
                {countdownInfo.activeType === "reconnect" && "Reconnecting"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy timer fallback for compatibility */}
      {countdownInfo.timeLeft === null && displayTimer !== null && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 translate-y-10 text-3xl font-mono text-white bg-black/50 px-3 py-1 rounded z-50">
          {displayTimer.toString().padStart(2, "0")}
        </div>
      )}

      {/* poker-table oval */}
      <div
        className="relative rounded-full border-8 border-[var(--brand-accent)] bg-main shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(1)`,
          transformOrigin: "center",
        }}
      >
        {communityRow}

        {/* Pot Display Bubbles */}
        <PotDisplayBubbles
          currentRoundBetting={currentRoundBetting}
          totalPot={totalPot}
          isMobile={isMobile}
        />

        {/* seats */}
        {layout.map((_, i) => seatAt(i))}
      </div>

      {/* Show-cards control moved into PlayerActionButtons */}
    </div>
  );
}
