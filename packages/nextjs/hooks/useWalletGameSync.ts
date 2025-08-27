import { useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useGameStore } from "./useGameStore";

/**
 * Hook to sync Starknet wallet connection with game store
 */
export function useWalletGameSync() {
  const { address, status } = useAccount();
  const { connectWallet, handleDisconnect, currentWalletId } = useGameStore();

  // Sync wallet connection with game store
  useEffect(() => {
    if (status === "connected" && address && address !== currentWalletId) {
      connectWallet(address);
    } else if (status === "disconnected" && currentWalletId) {
      // Only handle disconnect if we have a stored wallet - this means user logged out
      const storedAddress = localStorage.getItem("walletAddress") || localStorage.getItem("sessionId");
      if (!storedAddress) {
        // User actually logged out, handle disconnect
        handleDisconnect();
      } else if (storedAddress && storedAddress !== currentWalletId) {
        // Different stored address, connect to it
        connectWallet(storedAddress);
      }
    } else if (status === "disconnected" && !currentWalletId) {
      // Check for stored wallet address on initial load
      const storedAddress = localStorage.getItem("walletAddress") || localStorage.getItem("sessionId");
      if (storedAddress) {
        connectWallet(storedAddress);
      }
    }
  }, [address, status, currentWalletId, connectWallet, handleDisconnect]);

  return {
    isConnected: status === "connected" || !!(localStorage.getItem("walletAddress") || localStorage.getItem("sessionId")),
    address: address || localStorage.getItem("walletAddress") || localStorage.getItem("sessionId"),
    status
  };
}