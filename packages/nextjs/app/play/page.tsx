"use client";

// Play poker interface with wallet connect

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import ActionBar from "../../components/ActionBar";
import { usePlayViewModel } from "../../hooks/usePlayViewModel";
import { useGameStore } from "../../hooks/useGameStore";
import { useWalletGameSync } from "../../hooks/useWalletGameSync";
import { useTableViewModel } from "../../hooks/useTableViewModel";
import { PlayerState } from "../../game-engine";

// TODO: display connected address and handle signature (Action Plan 1.3)

export default function PlayPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const { joinTable, leaveSeat, sitOut, sitIn, playerAction, connectionState, playerStates, currentWalletId, playerIds } = useGameStore();
  const { isConnected, address } = useWalletGameSync();
  const { walletSeatIdx } = useTableViewModel();
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Check if current player is sitting out based on game state
  const mySeatIndex = playerIds.findIndex(id => id === currentWalletId);
  const isSittingOut = mySeatIndex >= 0 && playerStates[mySeatIndex] === PlayerState.SITTING_OUT;
  
  const {
    street,
    dealTurn,
    dealRiver,
    timer,
    stageNames,
    handStarted,
    handleActivate,
  } = usePlayViewModel();

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
    <main
      className="relative h-screen flex flex-col text-white bg-main overflow-hidden"
      style={{
        backgroundImage: "url('/nfts/nft2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="relative w-full flex items-center justify-center mt-6 mb-4 px-4">
        <AnimatedTitle text="Poker Night on Starknet" />
      </header>
      {/* Player Control Buttons - positioned in top right */}
      {walletSeatIdx >= 0 && (
        <div className="fixed top-20 right-4 z-20 flex flex-col gap-2">
          {/* Sit Out / Sit In Button */}
          <button
            onClick={handleSitOutToggle}
            disabled={connectionState === 'disconnected'}
            className={`btn btn-sm px-3 py-2 gap-0 !h-auto border transition-all ${
              connectionState === 'disconnected'
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
            disabled={isLeaving || connectionState === 'disconnected'}
            className={`btn btn-sm px-3 py-2 gap-0 !h-auto border transition-all ${
              isLeaving || connectionState === 'disconnected'
                ? "bg-gray-500 border-gray-500 text-gray-300 cursor-not-allowed opacity-50"
                : "bg-transparent border-[#5c4fe5] hover:bg-[#5c4fe5] hover:text-white text-white"
            }`}
          >
            {isLeaving ? "Leaving..." : "Leave Table"}
          </button>
        </div>
      )}

      
      <div className="flex-1 flex items-center justify-center">
        <Table timer={timer} />
      </div>
      <div
        id="action-buttons"
        className="fixed right-0 flex justify-end p-4 z-10 bottom-10 sm:bottom-0"
      >
        <ActionBar
          street={stageNames[street] ?? "preflop"}
          onActivate={handleActivate}
          onTurn={dealTurn}
          onRiver={dealRiver}
          hasHandStarted={handStarted}
        />
      </div>
      <DealerWindow />
    </main>
  );
}
