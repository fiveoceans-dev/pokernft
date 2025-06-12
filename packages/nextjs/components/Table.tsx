// src/pages/HomeTables.tsx
import { useEffect, useState } from "react";
import Table from "../components/Table";
import ActionBar from "../components/ActionBar";
import { useGameStore } from "../hooks/useGameStore";

// 1) Tell TypeScript that `window.starknet` exists:
declare global {
  interface Window {
    starknet?: {
      enable: (opts?: { showModal: boolean }) => Promise<void>;
      account: {
        address: string;
      };
    };
  }
}

export default function HomeTables() {
  const {
    players,
    community,
    joinSeat,
    street,
    reloadTableState,
    startHand,
    dealFlop,
    dealTurn,
    dealRiver,
  } = useGameStore();

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example tournament ID (must match on‐chain token_id)
  const TOURNAMENT_ID = "1";

  // 2) When the component mounts, attempt to connect Starknet wallet and reload state
  useEffect(() => {
    async function connectAndReload() {
      
    }
    connectAndReload();
  }, [reloadTableState]);

  // 3) Handle “Join Table” button click
  async function handleJoinTable() {
    setError(null);
    setIsJoining(true);

    
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-green-900 to-green-700 text-white">
      <header className="relative w-full max-w-6xl flex items-center justify-between mt-6 mb-4 px-4">
        <h1 className="text-4xl font-bold">PokerBoots × Starknet</h1>

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
