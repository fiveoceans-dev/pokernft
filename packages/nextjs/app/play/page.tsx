"use client";

// Play poker interface with wallet connect

import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import ActionBar from "../../components/ActionBar";
import { usePlayViewModel } from "../../hooks/usePlayViewModel";
import { randomAddress } from "../../utils/address";
import { useAccount } from "@starknet-react/core";

// TODO: display connected address and handle signature (Action Plan 1.3)

export default function PlayPage() {
  const {
    street,
    dealFlop,
    dealTurn,
    dealRiver,
    timer,
    stageNames,
    handStarted,
    handleActivate,
    socket,
    sessionId,
  } = usePlayViewModel();
  const { status } = useAccount();

  function handleDemoPlayer() {
    const addr = randomAddress();
    localStorage.setItem("sessionId", addr);
    window.location.reload();
  }

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
      <header className="relative w-full flex items-center mt-6 mb-4 px-4">
        <AnimatedTitle text="Poker Night on Starknet" />
        <div className="flex flex-1 items-center justify-end">
          <div className="flex flex-col items-end gap-2">
            <CustomConnectButton />
            {status === "disconnected" && (
              <button
                className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance border border-gray-500 hover:bg-gradient-nav hover:text-white"
                onClick={handleDemoPlayer}
              >
                Demo Player
              </button>
            )}
          </div>
          {/* TODO: persist session token and auto-reconnect (Action Plan 1.3) */}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <Table timer={timer} socket={socket} />
      </div>
      <DealerWindow />
      <div
        id="action-buttons"
        className="fixed bottom-0 right-0 flex justify-end p-4 z-10"
      >
        <ActionBar
          street={stageNames[street] ?? "preflop"}
          onActivate={handleActivate}
          onFlop={dealFlop}
          onTurn={dealTurn}
          onRiver={dealRiver}
          hasHandStarted={handStarted}
        />
      </div>
    </main>
  );
}
