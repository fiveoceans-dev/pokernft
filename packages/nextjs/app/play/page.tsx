"use client";

// Play poker interface with wallet connect

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import ActionBar from "../../components/ActionBar";
import { usePlayViewModel } from "../../hooks/usePlayViewModel";
import { useGameStore } from "../../hooks/useGameStore";
import { useWalletGameSync } from "../../hooks/useWalletGameSync";
import { useTableViewModel } from "../../hooks/useTableViewModel";

// TODO: display connected address and handle signature (Action Plan 1.3)

export default function PlayPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const { joinTable, leaveSeat, playerAction } = useGameStore();
  const { isConnected, address } = useWalletGameSync();
  const { walletSeatIdx } = useTableViewModel();
  
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
    if (walletSeatIdx >= 0) {
      // Auto-fold if it's the player's turn
      try {
        await playerAction({ type: "fold" });
      } catch (error) {
        // Ignore fold errors - player might not be in turn
      }
      // Leave the table
      await leaveSeat();
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
      {/* Leave Table Button - positioned in top right */}
      {walletSeatIdx >= 0 && (
        <div className="fixed top-20 right-4 z-20">
          <button
            onClick={handleLeaveTable}
            className="btn bg-transparent btn-sm px-2 py-[0.35rem] gap-0 !h-auto border border-[#5c4fe5] hover:bg-[#5c4fe5] hover:text-white transition-all"
          >
            Leave Table
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
