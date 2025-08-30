"use client";

// Play poker interface with wallet connect

import { useEffect, useRef, useState } from "react";
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
  const { walletSeatIdx, baseW, baseH } = useTableViewModel();
  const [isLeaving, setIsLeaving] = useState(false);
  const isMobile = useIsMobile();
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const [tableScale, setTableScale] = useState(1);
  const [tablePixelHeight, setTablePixelHeight] = useState(520);
  const [uiScale, setUiScale] = useState(1);

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

  // Calculate optimal table scale to fit viewport with controls
  useEffect(() => {
    const calculateLayout = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Fixed dimensions
      const HEADER_HEIGHT = 48; // Game header height
      const CONTROL_PANEL_HEIGHT = isMobile ? 180 : 120; // Control panel space
      const PADDING_VERTICAL = isMobile ? 20 : 40; // Top/bottom padding
      const PADDING_HORIZONTAL = isMobile ? 16 : 32; // Left/right padding
      const CARD_SPACE_TOP = isMobile ? 60 : 80; // Extra space for cards above table
      
      // Available space for table
      const availableWidth = viewportWidth - PADDING_HORIZONTAL;
      const availableHeight = viewportHeight - HEADER_HEIGHT - CONTROL_PANEL_HEIGHT - PADDING_VERTICAL - CARD_SPACE_TOP;
      
      // Calculate scale based on available space
      const scaleByWidth = availableWidth / baseW;
      const scaleByHeight = availableHeight / baseH;
      const optimalScale = Math.min(scaleByWidth, scaleByHeight, 1); // Never scale above 1
      
      // Set minimum scale for usability
      const minScale = isMobile ? 0.4 : 0.5;
      const finalScale = Math.max(optimalScale, minScale);
      
      setTableScale(finalScale);
      setTablePixelHeight(baseH * finalScale);
      setUiScale(Math.max(0.7, Math.min(1, finalScale))); // Keep controls readable
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);
  }, [baseW, baseH, isMobile]);

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
      className="play-page-container"
      style={{
        backgroundImage: "url('/nfts/nft2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Game Header */}
      <div className="game-header">
        <AnimatedTitle text="Poker Night on Starknet" />
        {walletSeatIdx >= 0 && (
          <div className="header-actions">
            <button
              onClick={handleSitOutToggle}
              disabled={connectionState === "disconnected"}
              className={`action-btn ${
                connectionState === "disconnected"
                  ? "disabled"
                  : isSittingOut
                    ? "sit-in"
                    : "sit-out"
              }`}
            >
              {isSittingOut ? "Sit In" : "Sit Out"}
            </button>

            <button
              onClick={handleLeaveClick}
              disabled={isLeaving || connectionState === "disconnected"}
              className={`action-btn leave ${
                isLeaving || connectionState === "disconnected" ? "disabled" : ""
              }`}
            >
              {isLeaving ? "Leaving..." : "Leave Table"}
            </button>
          </div>
        )}
      </div>

      {/* Table Area - Centered with padding for cards */}
      <div className="table-area">
        <div 
          className="table-container" 
          style={{ 
            width: `${baseW}px`, 
            height: `${baseH}px`,
            transform: `scale(${tableScale})`,
            transformOrigin: 'center center'
          }}
        >
          <Table timer={timer} />
        </div>
      </div>

      {/* Control Panel - Fixed at bottom */}
      <div className="control-panel">
        <div 
          className="control-panel-inner" 
          style={{ 
            transform: `scale(${uiScale})`,
            transformOrigin: 'center top'
          }}
        >
          <div className="control-sections">
            <div className="control-dealer">
              <DealerWindow isMobile={isMobile} />
            </div>

            <div className="control-actions">
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

            <div className="control-chat">
              <input
                type="text"
                placeholder="Send message"
                className="chat-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    console.log("Chat message:", e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <div className="chat-messages">
                <div className="text-gray-400 italic">No messages yet...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .game-container { padding: 8px; }

        /* Transparent game header; does not block cards */
        .game-header {
          background: transparent;
          border: 0;
        }

        .table-section { /* centers the [table + controls] group */ }

        .table-area {
          /* Reserved space to render table at computed scale; grid centers even when content overflows */
          padding: 8px 10px;
          padding-top: clamp(56px, 10vh, 96px); /* ensure cards not blocked by site header + in-game header */
          overflow: visible;
          display: grid;
          place-items: center;
        }

        .table-wrapper {
          /* Absolutely position base-size table, scale from top-left into the sized box */
          position: absolute;
          top: 0;
          left: 0;
          transform: scale(var(--table-scale, 1));
          transform-origin: top left;
          transition: transform 0.2s ease;
        }
        .table-box { position: relative; }

        .control-panel {
          width: 100%;
          position: relative;
          z-index: 11; /* Above other elements */
          background: transparent; /* panel is transparent; child components render their backgrounds */
          border: 0;
          border-radius: 0;
          margin-top: 8px; /* small space under the table */
          display: grid; /* center controls box horizontally */
          place-items: center;
        }

        /* Z-index layering */
        header {
          position: relative;
          z-index: 1;
        }

        .game-container {
          position: relative;
          z-index: 10;
          height: 100%;
          max-height: 100%;
          overflow: hidden; /* prevent body scroll and card clipping */
        }

        /* Simplified Responsive Layout System */
        .responsive-controls {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .controls-wrapper {
          /* Base width for control content, scaled via --ui-scale to fit */
          transform: scale(var(--ui-scale, 1));
          transform-origin: top center;
        }
        .controls-box { display: grid; place-items: center; position: relative; }

        /* Components handle their own styling now */

        /* Controls size to content (no forced heights) */
        .control-dealer,
        .control-actions,
        .control-chat {
          min-height: 0;
          height: auto;
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
            height: auto;
          }
          .control-actions {
            flex: 2;
            height: auto;
            display: flex;
            align-items: flex-start;
            justify-content: center;
          }
        }

        /* Mobile layout - STACKED: Dealer → Controls → Chat */
        @media (max-width: 767px), (max-height: 700px) {
          .responsive-controls {
            flex-direction: column;
            gap: 0.25rem;
            width: 100%;
          }
          .table-area { padding: 6px 8px; }
          .control-dealer {
            order: 1;
            height: 2.5rem; /* compact dealer */
          }
          .control-actions {
            order: 2;
            height: auto;
            display: flex;
            justify-content: center;
          }
          .control-chat {
            order: 3;
            height: 2.5rem; /* compact chat */
          }
          /* Control panel sits at bottom via flex layout (no sticky/fixed) */
          /* Use measured scale only (no extra transform overrides) */
        }

        /* Ultra-compact for very short screens */
        @media (max-height: 500px) {
          .game-container {
            --game-header-height: 36px;
            --controls-height: clamp(64px, 16vh, 96px);
            --gap-size: 10px;
          }
          .game-header { padding-top: 2px; padding-bottom: 2px; }
          .control-dealer,
          .control-actions,
          .control-chat {
            height: 64px !important;
          }
        }

        @media (min-width: 1024px) { }

        @media (max-width: 767px) { .game-container { padding: 4px; } }

        @media (max-height: 640px) and (max-width: 767px) { .control-dealer, .control-chat { height: 2.25rem; } }

        @media (max-width: 639px) { }

        @media (max-width: 480px) { .game-container { padding: 2px; } }
      `}</style>
      <style jsx global>{`
        html,
        body {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
