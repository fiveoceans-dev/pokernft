import { useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useGameStore } from "./useGameStore";

/**
 * Hook to sync Starknet wallet connection with game store
 */
export function useWalletGameSync() {
  const { address, status } = useAccount();
  const { connectWallet, walletId } = useGameStore();

  // Sync wallet connection with game store
  useEffect(() => {
    if (status === "connected" && address && address !== walletId) {
      connectWallet(address);
    } else if (status === "disconnected") {
      // Check for demo address from localStorage
      const demoAddress = localStorage.getItem("sessionId");
      if (demoAddress && demoAddress !== walletId) {
        connectWallet(demoAddress);
      }
    }
  }, [address, status, walletId, connectWallet]);

  return {
    isConnected: status === "connected" || !!localStorage.getItem("sessionId"),
    address: address || localStorage.getItem("sessionId"),
    status
  };
}