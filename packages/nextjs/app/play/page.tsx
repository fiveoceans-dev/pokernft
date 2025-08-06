"use client";

import ActionBar from "../../components/ActionBar";
import Table from "../../components/Table";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import { useGameStore } from "../../hooks/useGameStore";

export default function PlayPage() {
  const { street, startHand, dealFlop, dealTurn, dealRiver } = useGameStore();

  const stageNames = ["preflop", "flop", "turn", "river", "showdown"] as const;

  return (
    <main className="min-h-screen flex flex-col items-center text-white">
      <header className="relative w-full max-w-6xl flex items-center justify-between mt-6 mb-4 px-4">
        <h1 className="text-4xl font-bold">PokerBoots × Starknet</h1>
        <button
          className="absolute left-1/2 -translate-x-1/2 btn"
          onClick={() => alert("join logic TBD")}
        >
          Join Table
        </button>
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
