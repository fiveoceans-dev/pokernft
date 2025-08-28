// src/components/Table.tsx

import { Fragment } from "react";
import type { CSSProperties } from "react";
import { useTableViewModel } from "../hooks/useTableViewModel";
import { useGameStore } from "../hooks/useGameStore";
import Card from "./Card";
import { indexToCard, PlayerState } from "../game-engine";
import PlayerSeat from "./PlayerSeat";
import type { UiPlayer, Card as TCard } from "../game-engine";
import { useWalletGameSync } from "../hooks/useWalletGameSync";
import ActionButtons from "./ActionButtons";
import { PotDisplayBubbles } from "./PotDisplayBubbles";
import useIsMobile from "../hooks/useIsMobile";

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
  const { isConnected, address } = useWalletGameSync();
  const isMobile = useIsMobile();

  // Debug logging for player data
  console.log("🎲 Table component debug:", {
    playersCount: players.filter(p => p).length,
    players: players.map((p, i) => ({ seat: i, name: p })).filter(p => p.name),
    playerIds: playerIds.map((id, i) => ({ seat: i, id: id?.slice(0, 10) + "..." })).filter(p => p.id && p.id !== "undefined..."),
    chips: chips.map((c, i) => ({ seat: i, chips: c })).filter(c => c.chips > 0),
    currentTurn,
    dealerIndex,
    displayTimer
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
    const storedAddress = typeof window !== "undefined" ? localStorage.getItem("walletAddress") : null;
    
    console.log("🔍 Address validation for seating:", {
      navbarAddress: address.slice(0, 10) + "...",
      gameStoreAddress: gameStoreAddress?.slice(0, 10) + "..." || "null",
      storedAddress: storedAddress?.slice(0, 10) + "..." || "null"
    });
    
    // Priority validation: navbar address should match game store and localStorage
    if (gameStoreAddress !== address) {
      console.warn("🚫 Address mismatch: navbar vs game store", { navbar: address, gameStore: gameStoreAddress });
      alert("Wallet address mismatch detected. Please reconnect your wallet.");
      return;
    }
    
    if (storedAddress !== address) {
      console.warn("🚫 Address mismatch: navbar vs localStorage", { navbar: address, stored: storedAddress });
      alert("Wallet address mismatch detected. Please reconnect your wallet.");
      return;
    }
    
    // Prevent seating if this wallet is already seated at the table
    if (playerIds.some((id) => id?.toLowerCase() === address.toLowerCase())) {
      alert("You are already seated at this table");
      return;
    }
    
    // Additional validation: check if any other address variants are seated
    if (gameStoreAddress && playerIds.some((id) => id && id.toLowerCase() === gameStoreAddress.toLowerCase() && id.toLowerCase() !== address.toLowerCase())) {
      console.warn("🚫 Different address variant already seated", { seated: gameStoreAddress, requesting: address });
      alert("A different variant of your wallet address is already seated. Please refresh the page.");
      return;
    }
    
    console.log("✅ Address validation passed, joining seat", idx, "with address:", address.slice(0, 10) + "...");
    // Join seat using the validated address
    joinSeat(idx);
  };

  // The table is always visible; wallet connections are handled elsewhere.

  const holeCardSize = "sm";

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

    const dx = 50 - parseFloat(pos.x);
    const dy = 50 - parseFloat(pos.y);
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = 40;
    const dealerOffset = { x: (dx / mag) * offset, y: (dy / mag) * offset };
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
      ? [indexToCard(handCodes[0]), indexToCard(handCodes[1])]
      : null;
    const state = playerStates[idx];
    // TODO: visually mark auto-folded players (Action Plan 1.2)
    const player: UiPlayer = {
      name: nickname,
      address: addr ?? "",
      chips: chips[idx] ?? 0,
      hand,
      folded: state === PlayerState.FOLDED,
      currentBet: playerBets[idx] ?? 0,
    };
    const isDealer = idx === dealerIndex;
    const isActive = idx === currentTurn;
    const isWinner = recentWinners.has(idx);
    // Reveal cards for own player always, or if manually revealed, or all non-folded players during showdown (street 4)
    const reveal = idx === walletSeatIdx || cardsRevealed[idx] || (street === 4 && state !== PlayerState.FOLDED && state !== PlayerState.EMPTY);

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

    const betX = (parseFloat(pos.x) + 50) / 2;
    const betY = (parseFloat(pos.y) + 50) / 2;
    const betStyle = {
      left: `${betX}%`,
      top: `${betY}%`,
      transform: "translate(-50%, -50%)",
    } as CSSProperties;
    const betAmount = player.currentBet ?? 0;
    let betBg = "bg-yellow-500";
    if (betAmount > 1000) betBg = "bg-black";
    else if (betAmount > 500) betBg = "bg-blue-500";
    else if (betAmount > 250) betBg = "bg-red-500";
    else if (betAmount > 100) betBg = "bg-green-500";

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
      </Fragment>
    );
  };

  // BANK element removed - replaced with pot display bubbles

  /* community cards – only reveal dealt streets */
  const visibleCommunity = community.filter((c): c is number => c !== null);
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center gap-2 w-full">
      {visibleCommunity.map((code, i) => (
        <Card key={i} card={indexToCard(code)} size={communityCardSize} />
      ))}
    </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      {/* Unified white countdown timer - used for both game start and player action timers */}
      {displayTimer !== null && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-3xl font-mono text-white bg-black/50 px-3 py-1 rounded z-50">
          {displayTimer.toString().padStart(2, "0")}
        </div>
      )}


      {/* poker-table oval */}
      <div
        className="relative rounded-full border-8 border-[var(--brand-accent)] bg-main shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(${tableScale})`,
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

      {/* Smart Action Buttons */}
      <ActionButtons />
      
      {/* Card Reveal Button - Show during showdown if player hasn't revealed cards */}
      {street === 4 && walletSeatIdx !== null && walletSeatIdx >= 0 && 
       playerStates[walletSeatIdx] !== PlayerState.FOLDED && 
       playerStates[walletSeatIdx] !== PlayerState.EMPTY && 
       !cardsRevealed[walletSeatIdx] && (
        <div className="mt-2">
          <button
            onClick={() => revealCards(walletSeatIdx)}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-lg font-bold transition-colors shadow-lg border-2 border-yellow-400 animate-bounce"
          >
            🃏 Show Your Cards
          </button>
        </div>
      )}
    </div>
  );
}
