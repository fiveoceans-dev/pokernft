"use client";

// Play poker interface with wallet connect

import ActionBar from "../../components/ActionBar";
import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import { useGameStore } from "../../hooks/useGameStore";

export default function PlayPage() {
  const { street, startHand, dealFlop, dealTurn, dealRiver } = useGameStore();

  const stageNames = ["preflop", "flop", "turn", "river", "showdown"] as const;

  return (
    <main
      className="h-screen flex flex-col text-white bg-main overflow-hidden"
      style={{
        backgroundImage: "url('/nfts/nft2.png')",
        backgroundSize: "auto 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="relative w-full max-w-6xl flex items-center justify-between mt-6 mb-4 px-4">
        <AnimatedTitle text="Poker Night on Starknet" />
        <div className="ml-auto flex items-center gap-4">
          <ActionBar
            street={stageNames[street] ?? "preflop"}
            onStart={startHand}
            onFlop={dealFlop}
            onTurn={dealTurn}
            onRiver={dealRiver}
          />
          <CustomConnectButton />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <Table />
      </div>
    </main>
  );
}
