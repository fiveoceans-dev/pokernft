"use client";

// Play poker interface with wallet connect

import ActionBar from "../../components/ActionBar";
import Table from "../../components/Table";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import { useGameStore } from "../../hooks/useGameStore";

export default function PlayPage() {
  const { street, startHand, dealFlop, dealTurn, dealRiver } = useGameStore();

  const stageNames = ["preflop", "flop", "turn", "river", "showdown"] as const;

  return (
    <main
      className="min-h-screen flex flex-col text-white bg-cover bg-center"
      style={{ backgroundImage: `url('/nfts/nft2.png')` }}
    >
      <header className="relative w-full max-w-6xl flex justify-between items-center mt-6 mb-4 px-4">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-left">Poker Night on Starknet</h1>
        </div>
        <div className="flex items-center gap-4">
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
      <Table />
    </main>
  );
}
