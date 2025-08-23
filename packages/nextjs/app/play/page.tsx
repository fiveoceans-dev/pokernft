"use client";

// Play poker interface with wallet connect

import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import ActionBar from "../../components/ActionBar";
import { usePlayViewModel } from "../../hooks/usePlayViewModel";

// TODO: display connected address and handle signature (Action Plan 1.3)

export default function PlayPage() {
  const {
    street,
    dealTurn,
    dealRiver,
    timer,
    stageNames,
    handStarted,
    handleActivate,
    socket,
  } = usePlayViewModel();

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
            </div>
          {/* TODO: persist session token and auto-reconnect (Action Plan 1.3) */}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <Table timer={timer} socket={socket} />
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
