"use client";

import { useEffect, useState } from "react";
import ActionBar from "../../components/ActionBar";
import Table from "../../components/Table";
import { useGameStore } from "../../hooks/useGameStore";

export default function PlayPage() {
  const { street, reloadTableState, startHand, dealFlop, dealTurn, dealRiver } =
    useGameStore();

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const TOURNAMENT_ID = "1";

  useEffect(() => {
    async function connect() {
      if (window.starknet) {
        try {
          await window.starknet.enable({ showModal: true });
          await reloadTableState();
        } catch {
          setError("Wallet connection failed");
        }
      } else {
        setError("No Starknet wallet found");
      }
    }
    connect();
  }, [reloadTableState]);

  async function handleJoinTable() {
    setError(null);
    setIsJoining(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-green-900 to-green-700 text-white">
      <header className="relative w-full max-w-6xl flex items-center justify-between mt-6 mb-4 px-4">
        <h1 className="text-4xl font-bold">Tournament Table</h1>
        <button
          disabled={isJoining}
          className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-blue-900 hover:bg-red-500 font-semibold disabled:opacity-50"
          onClick={handleJoinTable}
        >
          {isJoining ? "Joining…" : "Join Table"}
        </button>
        {error && <p className="text-red-400 ml-2">{error}</p>}
        <ActionBar
          street={street}
          onStart={startHand}
          onFlop={dealFlop}
          onTurn={dealTurn}
          onRiver={dealRiver}
        />
      </header>
      <Table />
    </main>
  );
}
