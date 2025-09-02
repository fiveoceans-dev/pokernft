"use client";

import { useState } from "react";
import { useGameStore } from "../hooks/useGameStore";
import useIsMobile from "../hooks/useIsMobile";
import { captureAndDownloadScreen } from "../utils/screenCapture";

interface Props {
  isPlayerTurn: boolean;
  currentBet: number;
  playerCommitted: number;
  playerChips: number;
  minRaise?: number;
  isMobile?: boolean;
}

export default function PlayerActionButtons({
  isPlayerTurn,
  currentBet,
  playerCommitted,
  playerChips,
  minRaise,
  isMobile: propIsMobile,
}: Props) {
  const { playerAction, connectionState, bigBlind } = useGameStore();
  const effectiveMinRaise = minRaise ?? bigBlind;
  const [raiseAmount, setRaiseAmount] = useState(effectiveMinRaise);
  const [isActionPending, setIsActionPending] = useState(false);
  const hookIsMobile = useIsMobile();
  const isMobile = propIsMobile ?? hookIsMobile;

  // Always render container to preserve space - content visibility controlled below
  const toCall = Math.max(0, currentBet - playerCommitted);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && playerChips > 0;
  const canRaise = playerChips > toCall + effectiveMinRaise;
  const maxRaise = Math.max(0, playerChips - toCall);

  const handleAction = async (action: string, amount?: number) => {
    if (isActionPending) return;

    setIsActionPending(true);
    try {
      await playerAction({ type: action as any, amount });
      console.log(`✅ Player action: ${action}${amount ? ` (${amount})` : ""}`);
    } catch (error) {
      console.error(`❌ Action failed: ${action}`, error);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRaiseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || effectiveMinRaise;
    setRaiseAmount(Math.max(effectiveMinRaise, Math.min(value, maxRaise)));
  };

  const showActions = isPlayerTurn && connectionState !== "disconnected";

  const handleScreenCapture = async () => {
    try {
      await captureAndDownloadScreen();
    } catch (error) {
      console.error("Failed to capture screen:", error);
    }
  };

  // Show-cards UI state
  const {
    street,
    players,
    playerIds,
    playerStates,
    cardsRevealed,
    currentWalletId,
    revealCards,
    autoRevealAtShowdown,
    setAutoRevealAtShowdown,
  } = useGameStore();

  const walletSeat = currentWalletId
    ? playerIds.findIndex(
        (id) => id?.toLowerCase() === currentWalletId.toLowerCase(),
      )
    : -1;
  const canShowCards =
    street === 4 &&
    walletSeat >= 0 &&
    playerStates[walletSeat] !== "folded" &&
    playerStates[walletSeat] !== "empty" &&
    !cardsRevealed[walletSeat];

  return (
    <div
      className={`bg-black/40 backdrop-blur-sm rounded-lg p-3 w-full h-full border border-gray-600/30 flex flex-col justify-between transition-all duration-300 ${
        isMobile ? "text-[10px] min-h-[160px]" : "text-xs min-h-[140px]"
      }`}
    >
      {/* Row 1 - Action Buttons (Fixed positions) */}
      <div
        className={`flex mb-2 ${
          isMobile ? "flex-wrap justify-center gap-1" : "justify-center gap-1"
        }`}
        style={{ minHeight: "36px" }}
      >
        {/* Fold - Position 1 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions ? (
            <button
              onClick={() => handleAction("FOLD")}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-gray-600 hover:bg-gray-700 cursor-not-allowed"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              Fold
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              Fold
            </div>
          )}
        </div>

        {/* Check - Position 2 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions && canCheck ? (
            <button
              onClick={() => handleAction("CHECK")}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-blue-600 hover:bg-blue-700 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Check
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              Check
            </div>
          )}
        </div>

        {/* Call - Position 3 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions && canCall ? (
            <button
              onClick={() => handleAction("CALL")}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-green-600 hover:bg-green-700 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Call {playerChips < toCall ? `${playerChips} (All-in)` : toCall}
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              Call
            </div>
          )}
        </div>

        {/* Bet - Position 4 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions && canRaise && toCall === 0 ? (
            <button
              onClick={() => handleAction("BET", raiseAmount)}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-red-600 hover:bg-red-700 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Bet
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              Bet
            </div>
          )}
        </div>

        {/* Raise - Position 5 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions && canRaise && toCall > 0 ? (
            <button
              onClick={() => handleAction("RAISE", raiseAmount)}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-red-600 hover:bg-red-700 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Raise
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              Raise
            </div>
          )}
        </div>

        {/* All-in - Position 6 */}
        <div className="flex justify-center" style={{ minWidth: "70px" }}>
          {showActions && playerChips > 0 ? (
            <button
              onClick={() => handleAction("ALLIN")}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? "bg-purple-600 hover:bg-purple-700 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              All-in
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">
              All-in
            </div>
          )}
        </div>
      </div>

      {/* Row 2 - Camera Button + Quick Bet Buttons */}
      <div
        className="flex items-center justify-between gap-1 mb-2"
        style={{ minHeight: "32px" }}
      >
        {/* Left cluster: Screenshot + Show Cards dashed area */}
        <div className="flex items-center gap-2">
          {/* Camera Capture Button */}
          <button
            onClick={handleScreenCapture}
            className="w-8 h-8 flex items-center justify-center rounded font-medium transition-all duration-200 text-black shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60"
            title="Capture Screenshot"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 15.5c1.93 0 3.5-1.57 3.5-3.5S13.93 8.5 12 8.5 8.5 10.07 8.5 12s1.57 3.5 3.5 3.5zM17.5 9c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5zM20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
          </button>

          {/* Reveal area */}
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-black/20">
            {canShowCards && (
              <button
                onClick={() => walletSeat >= 0 && revealCards(walletSeat)}
                className="px-2 h-8 rounded text-xs font-medium transition-all duration-200 text-white shadow-sm bg-yellow-600 hover:bg-yellow-700"
              >
                Show Cards
              </button>
            )}
            <label className="flex items-center gap-1 text-[10px] text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-yellow-500 cursor-pointer"
                checked={autoRevealAtShowdown}
                onChange={(e) => setAutoRevealAtShowdown(e.target.checked)}
              />
              Auto-show
            </label>
          </div>
        </div>

        {/* Quick Bet Buttons - Right Side */}
        {showActions && canRaise && maxRaise > effectiveMinRaise ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setRaiseAmount(Math.min(effectiveMinRaise * 2, maxRaise))
              }
              className="min-w-[50px] h-8 px-2 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center"
              disabled={effectiveMinRaise * 2 > maxRaise}
            >
              2BB
            </button>
            <button
              onClick={() =>
                setRaiseAmount(Math.min(effectiveMinRaise * 3, maxRaise))
              }
              className="min-w-[50px] h-8 px-2 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center"
              disabled={effectiveMinRaise * 3 > maxRaise}
            >
              3BB
            </button>
          </div>
        ) : (
          <div className="opacity-0 pointer-events-none flex items-center gap-1">
            <div className="min-w-[50px] h-8 px-2 text-xs flex items-center justify-center">
              2BB
            </div>
            <div className="min-w-[50px] h-8 px-2 text-xs flex items-center justify-center">
              3BB
            </div>
          </div>
        )}
      </div>

      {/* Row 3 - Betting Controls (Full width) */}
      <div
        className={`w-full flex items-center ${isMobile ? "gap-0.5" : "gap-1"}`}
        style={{ minHeight: "32px" }}
      >
        {showActions && canRaise && maxRaise > effectiveMinRaise ? (
          <>
            {/* Minus Button */}
            <button
              onClick={() => {
                const newAmount = Math.max(
                  raiseAmount - effectiveMinRaise,
                  effectiveMinRaise,
                );
                setRaiseAmount(newAmount);
              }}
              disabled={raiseAmount <= effectiveMinRaise}
              className="w-8 h-8 flex items-center justify-center rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>

            {/* Betting Slider - Full width */}
            <input
              type="range"
              min={effectiveMinRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-md appearance-none cursor-pointer slider"
            />

            {/* Plus Button */}
            <button
              onClick={() => {
                const newAmount = Math.min(
                  raiseAmount + effectiveMinRaise,
                  maxRaise,
                );
                setRaiseAmount(newAmount);
              }}
              disabled={raiseAmount >= maxRaise}
              className="w-8 h-8 flex items-center justify-center rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>

            {/* Bet Amount Input */}
            <input
              type="number"
              min={effectiveMinRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={handleRaiseAmountChange}
              className={`${isMobile ? "w-12" : "w-16"} h-8 px-1 bg-black/40 text-white rounded text-center hover:bg-black/60 transition-colors text-xs flex-shrink-0`}
            />
          </>
        ) : (
          <div
            className={`opacity-0 pointer-events-none flex items-center ${isMobile ? "gap-0.5" : "gap-1"} w-full`}
          >
            <div className="w-8 h-8">-</div>
            <div className="flex-1 h-2">slider</div>
            <div className="w-8 h-8">+</div>
            <div className={`${isMobile ? "w-12" : "w-16"} h-8 px-1`}>
              input
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        /* Custom range slider styling to prevent overflow on small screens */
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 6px;
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #fbbf24; /* amber-400 */
          border: 2px solid rgba(0, 0, 0, 0.6);
          border-radius: 9999px;
        }
        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #fbbf24;
          border: 2px solid rgba(0, 0, 0, 0.6);
          border-radius: 9999px;
        }
        .slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 6px;
        }
        .slider::-moz-range-track {
          height: 4px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
