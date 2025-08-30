"use client";

// Play poker interface with wallet connect

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import PlayerActionButtons from "../../components/PlayerActionButtons";
import { useGameStore } from "../../hooks/useGameStore";
import { useWalletGameSync } from "../../hooks/useWalletGameSync";
import { useTableViewModel } from "../../hooks/useTableViewModel";
import { usePlayViewModel } from "../../hooks/usePlayViewModel";
import useIsMobile from "../../hooks/useIsMobile";
import { PlayerState } from "../../game-engine";

// TODO: display connected address and handle signature (Action Plan 1.3)

export default function PlayPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const {
    joinTable,
    leaveSeat,
    sitOut,
    sitIn,
    playerAction,
    connectionState,
    playerStates,
    currentWalletId,
    playerIds,
    currentTurn,
    chips,
    playerBets,
    minRaise,
  } = useGameStore();
  const { isConnected, address } = useWalletGameSync();
  const { walletSeatIdx } = useTableViewModel();
  const [isLeaving, setIsLeaving] = useState(false);
  const isMobile = useIsMobile();

  // Check if current player is sitting out based on game state
  const mySeatIndex = playerIds.findIndex((id) => id === currentWalletId);
  const isSittingOut =
    mySeatIndex >= 0 && playerStates[mySeatIndex] === PlayerState.SITTING_OUT;

  // Calculate action button props
  const isMyTurn = currentTurn !== null && currentTurn === mySeatIndex;
  const myChips = mySeatIndex >= 0 ? chips[mySeatIndex] : 0;
  const myCommitted = mySeatIndex >= 0 ? playerBets[mySeatIndex] : 0;
  const currentBet = Math.max(...playerBets.filter((bet) => bet !== null));
  // Debug logging for action button visibility
  console.log(`🎮 [PlayPage] Action button calculation:`, {
    currentTurn,
    mySeatIndex,
    isMyTurn,
    isSittingOut,
    shouldShowButtons: isMyTurn && !isSittingOut,
    myChips,
    currentBet,
  });

  const { timer } = usePlayViewModel();

  useEffect(() => {
    if (tableId) {
      joinTable(tableId);
    } else {
      // Default table for backward compatibility
      joinTable("demo");
    }
  }, [tableId, joinTable]);

  const handleLeaveTable = async () => {
    if (walletSeatIdx < 0) return;

    setIsLeaving(true);
    try {
      // Auto-fold if it's the player's turn
      try {
        await playerAction({ type: "fold" });
      } catch (error) {
        // Ignore fold errors - player might not be in turn
        console.log("No fold needed or not player's turn");
      }

      // Leave the table
      await leaveSeat();

      console.log("✅ Successfully left the table");
    } catch (error) {
      console.error("❌ Failed to leave table:", error);
      // Show error to user but don't prevent leaving
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveClick = () => {
    handleLeaveTable();
  };

  const handleSitOutToggle = async () => {
    if (walletSeatIdx < 0) return;

    try {
      if (isSittingOut) {
        await sitIn();
        console.log("✅ Returned to active play");
      } else {
        await sitOut();
        console.log("✅ Sitting out");
      }
      // Don't manually toggle state - let the server response update it
    } catch (error) {
      console.error("❌ Failed to toggle sit out:", error);
    }
  };

  return (
    <div
      className="h-screen text-white bg-main flex flex-col"
      style={{
        backgroundImage: "url('/nfts/nft2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Compact Game Header */}
      <div className="flex justify-between items-center px-4 py-2 h-12 flex-shrink-0">
        <AnimatedTitle text="Poker Night on Starknet" />
        {walletSeatIdx >= 0 && (
          <div className="flex gap-2">
            {/* Sit Out / Sit In Button */}
            <button
              onClick={handleSitOutToggle}
              disabled={connectionState === "disconnected"}
              className={`btn btn-sm px-2 py-1 text-xs border transition-all ${
                connectionState === "disconnected"
                  ? "bg-gray-500 border-gray-500 text-gray-300 cursor-not-allowed opacity-50"
                  : isSittingOut
                    ? "bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 text-white"
                    : "bg-yellow-600 border-yellow-600 hover:bg-yellow-700 hover:border-yellow-700 text-white"
              }`}
            >
              {isSittingOut ? "Sit In" : "Sit Out"}
            </button>

            {/* Leave Table Button */}
            <button
              onClick={handleLeaveClick}
              disabled={isLeaving || connectionState === "disconnected"}
              className={`btn btn-sm px-2 py-1 text-xs border transition-all ${
                isLeaving || connectionState === "disconnected"
                  ? "bg-gray-500 border-gray-500 text-gray-300 cursor-not-allowed opacity-50"
                  : "bg-transparent border-[#5c4fe5] hover:bg-[#5c4fe5] hover:text-white text-white"
              }`}
            >
              {isLeaving ? "Leaving..." : "Leave Table"}
            </button>
          </div>
        )}
      </div>

      {/* Main Game Content - Centered */}
      <div className="game-container flex-1 flex items-center justify-center">
        {/* Table Section - Contains table, gap, and controls as unified unit */}
        <div className="table-section flex flex-col w-full">
          {/* Table Wrapper - Horizontally centered */}
          <div className="table-area flex items-center justify-center w-full">
            <div className="table-wrapper mx-auto">
              <Table timer={timer} />
            </div>
          </div>

          {/* 20px gap between table and controls */}
          <div className="table-gap"></div>

          {/* Control Panel - Unified responsive layout */}
          <div className="control-panel flex-shrink-0 responsive-controls w-full px-2">
            {/* Dealer Window */}
            <div className="control-dealer">
              <DealerWindow isMobile={isMobile} />
            </div>

            {/* Action Buttons */}
            <div className="control-actions w-full">
              {walletSeatIdx >= 0 && (
                <PlayerActionButtons
                  isPlayerTurn={isMyTurn && !isSittingOut}
                  currentBet={currentBet}
                  playerCommitted={myCommitted}
                  playerChips={myChips}
                  minRaise={minRaise}
                  isMobile={isMobile}
                />
              )}
            </div>

            {/* Chat */}
            <div className="control-chat">
              <div className="w-full h-full text-xs flex flex-col">
                <input
                  type="text"
                  placeholder="Send message"
                  className="w-full px-2 py-1 text-white rounded text-xs border border-black/40 placeholder-gray-300 font-bold focus:border-black/60 focus:outline-none bg-transparent mb-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // TODO: Implement chat message sending
                      console.log("Chat message:", e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="text-gray-400 italic">No messages yet...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-[15px] flex-shrink-0 bg-black/20"></div>

      <style jsx>{`
        .game-container {
          --main-header-height: 64px; /* Main site header height */
          --game-header-height: 48px; /* Game header height */
          --footer-height: 15px; /* Footer height */
          --gap-size: 20px;
          --controls-height: 160px;
          --safe-padding: 16px; /* Safe area padding */
          --min-table-height: 400px; /* Minimum usable table height */
          padding: 8px;
        }

        .table-section {
          /* Centered content with card visibility */
          max-height: calc(
            100vh - var(--main-header-height) - var(--game-header-height) - var(
                --footer-height
              )
          );
          overflow: visible; /* Allow cards to show */
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .table-area {
          /* Auto height with padding for card overflow */
          flex-shrink: 0;
          padding: 20px 10px;
          overflow: visible;
        }

        .table-wrapper {
          /* Dynamic viewport-aware scaling with preserved aspect ratio */
          transform: scale(
            min(
              1,
              (100vw - 40px) / 820px,
              /* Width constraint */
                (
                  100vh - var(--main-header-height) - var(
                      --game-header-height
                    ) - var(--footer-height) - var(--controls-height) - var(
                      --gap-size
                    ) -
                    80px
                ) /
                520px /* Height constraint with buffer */
            )
          );
          transform-origin: center center;
          transition: transform 0.3s ease;
        }

        .table-gap {
          height: var(--gap-size);
          flex-shrink: 0;
        }

        .control-panel {
          height: var(--controls-height);
          width: 100%;
          position: relative;
          z-index: 11; /* Above other elements */
        }

        /* Z-index layering */
        header {
          position: relative;
          z-index: 1;
        }

        .game-container {
          position: relative;
          z-index: 10;
          max-height: 100vh;
          overflow: hidden;
        }

        /* Simplified Responsive Layout System */
        .responsive-controls {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        /* Components handle their own styling now */

        /* Ensure all components have consistent heights */
        .control-dealer,
        .control-actions,
        .control-chat {
          min-height: var(--controls-height);
          height: var(--controls-height);
          overflow: hidden;
        }

        /* Desktop/Tablet (>= 768px) */
        @media (min-width: 768px) {
          .responsive-controls {
            flex-direction: row;
            width: 100%;
          }
          .control-dealer,
          .control-chat {
            flex: 1;
            height: var(--controls-height);
          }
          .control-actions {
            flex: 2;
            height: var(--controls-height);
            display: flex;
            align-items: flex-start;
            justify-content: center;
          }
        }

        /* Mobile layout - STACKED: Controls → Dealer → Chat */
        @media (max-width: 767px), (max-height: 700px) {
          .responsive-controls {
            flex-direction: column;
            gap: 0.25rem;
            width: 100%;
          }
          .control-actions {
            order: 1;
            height: auto;
            display: flex;
            justify-content: center;
          }
          .control-dealer {
            order: 2;
            height: 3rem; /* 2 lines */
          }
          .control-chat {
            order: 3;
            height: 3rem; /* 2 lines */
          }
          .table-wrapper {
            /* Smaller scale to accommodate stacked layout with footer */
            transform: scale(
              min(
                1,
                min(
                  (100vw - 20px) / 600px,
                  (
                      100vh - var(--main-header-height) - var(
                          --game-header-height
                        ) - var(--footer-height) -
                        200px
                    ) /
                    400px
                )
              )
            ) !important;
          }
        }

        /* Ultra-compact for very short screens */
        @media (max-height: 500px) {
          .game-container {
            --main-header-height: 48px;
            --game-header-height: 36px;
            --controls-height: 80px;
            --gap-size: 10px;
          }
          .control-dealer,
          .control-actions,
          .control-chat {
            height: 80px !important;
          }
        }

        @media (min-width: 1024px) {
          .game-container {
            --controls-height: 180px;
          }
        }

        @media (max-width: 767px) {
          .game-container {
            --main-header-height: 56px; /* Smaller main header on mobile */
            --game-header-height: 44px;
            --gap-size: 16px;
            --controls-height: 200px;
            padding: 4px;
          }
        }

        @media (max-width: 639px) {
          .game-container {
            --controls-height: 180px; /* Compact for mobile stacked layout */
            --min-table-height: 300px; /* Reduced minimum for small screens */
          }
        }

        @media (max-width: 480px) {
          .game-container {
            --controls-height: 200px; /* Optimized for small screens */
            --safe-padding: 8px; /* Reduced padding for more space */
            padding: 2px;
          }
        }
      `}</style>
    </div>
  );
}
