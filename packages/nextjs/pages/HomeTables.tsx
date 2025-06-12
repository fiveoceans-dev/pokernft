// src/pages/HomeTables.tsx
import { useState } from "react";
import { useGameStore } from "../hooks/useGameStore";
import { checkNFTOwnership, getTableStateContract } from "../services/starknet";
import ActionBar from "../components/ActionBar";
import Table from "../components/Table";

/**
 * HomeTables – allows a user to join the on-chain table (if they own the NFT) 
 * and then use the ActionBar buttons to drive the poker flow.
 */
export default function HomeTables() {
  const { startHand, dealFlop, dealTurn, dealRiver, street, reloadTableState } =
    useGameStore();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example tournament token ID that each ticket NFT represents
  const TOURNAMENT_ID = "1";

  async function handleJoinTable() {
    if (isJoining) return;
    setError(null);
    setIsJoining(true);

    try {
      // 1) Ensure a Starknet wallet is injected and connected
      if (!window.starknet) {
        throw new Error("No Starknet wallet detected");
      }

      const userAddress = window.starknet.account.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      // 2) Check NFT ownership via a view call
      const owns = await checkNFTOwnership(userAddress, TOURNAMENT_ID);
      if (!owns) {
        setError("You don’t own the tournament NFT—cannot join.");
        setIsJoining(false);
        return;
      }

      // 3) Call take_seat(0) on the TableState contract (seat index 0 for simplicity)
      const table = await getTableStateContract();
      // Positional arguments: [ tokenId (or seatIdx) as BigInt ]
      await table.invoke("take_seat", [BigInt(0)]);

      // 4) Refresh the on-chain state in our store (updates players array)
      await reloadTableState();
    } catch (err: any) {
      console.error(err);
      setError("Failed to join table: " + (err.message || err));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-green-900 to-green-700 text-white">
      <header className="relative w-full max-w-6xl flex items-center justify-between mt-6 mb-4 px-4">
        <h1 className="text-4xl font-bold">PokerBoots × Starknet</h1>

        {/* Join Table button */}
        <button
          disabled={isJoining}
          className="absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-blue-900 hover:bg-red-500 font-semibold disabled:opacity-50"
          onClick={handleJoinTable}
        >
          {isJoining ? "Joining…" : "Join Table"}
        </button>

        {/* Display any error from the join attempt */}
        {error && <p className="text-red-400 ml-2">{error}</p>}

        {/* ActionBar drives the deal/flop/turn/river flow */}
        <ActionBar
          street={street}
          onStart={startHand}
          onFlop={dealFlop}
          onTurn={dealTurn}
          onRiver={dealRiver}
        />
      </header>

      {/* The poker table UI */}
      <Table />
    </main>
  );
}
