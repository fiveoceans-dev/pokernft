import { useEffect, useCallback, useRef, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useGameStore } from "./useGameStore";

/**
 * Hook to sync Starknet wallet connection with game store
 */
export function useWalletGameSync() {
  const { address, status } = useAccount();
  const { connectWallet, handleDisconnect, currentWalletId } = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  // Safe connection wrapper with error handling
  const safeConnectWallet = useCallback(async (walletAddress: string) => {
    try {
      if (!walletAddress || typeof walletAddress !== 'string') {
        throw new Error('Invalid wallet address');
      }
      
      console.log('🔗 Attempting to connect wallet:', walletAddress);
      setError(null);
      connectWallet(walletAddress);
      
      // Set a timeout to detect connection issues
      connectionTimeoutRef.current = setTimeout(() => {
        setError('Wallet connection timeout');
      }, 10000);
      
    } catch (err) {
      console.error('🚫 Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Unknown wallet error');
    }
  }, [connectWallet]);

  // Safe disconnect wrapper with error handling
  const safeHandleDisconnect = useCallback(async () => {
    try {
      console.log('🔌 Attempting to disconnect wallet');
      setError(null);
      await handleDisconnect();
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('🚫 Wallet disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Unknown disconnect error');
    }
  }, [handleDisconnect]);

  // Sync wallet connection with game store
  useEffect(() => {
    try {
      if (status === "connected" && address && address !== currentWalletId) {
        console.log('🔄 Wallet connected, syncing with game store');
        safeConnectWallet(address);
        setIsInitialized(true);
        
      } else if (status === "disconnected" && currentWalletId) {
        // Only handle disconnect if we have a stored wallet - this means user logged out
        const storedAddress = localStorage.getItem("walletAddress") || localStorage.getItem("sessionId");
        
        if (!storedAddress) {
          // User actually logged out, handle disconnect
          console.log('🚪 User logged out, handling disconnect');
          safeHandleDisconnect();
          
        } else if (storedAddress && storedAddress !== currentWalletId) {
          // Different stored address, connect to it
          console.log('🔄 Different stored address, reconnecting');
          safeConnectWallet(storedAddress);
        }
        
      } else if (status === "disconnected" && !currentWalletId && !isInitialized) {
        // Check for stored wallet address on initial load
        const storedAddress = localStorage.getItem("walletAddress") || localStorage.getItem("sessionId");
        if (storedAddress) {
          console.log('🔄 Found stored wallet on initial load, connecting');
          safeConnectWallet(storedAddress);
        }
        setIsInitialized(true);
      }
      
      // Clear connection timeout and error on successful state changes
      if (connectionTimeoutRef.current && (status === "connected" || !currentWalletId)) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        setError(null); // Clear any lingering errors
      }
      
    } catch (err) {
      console.error('🚫 Wallet sync error:', err);
      setError(err instanceof Error ? err.message : 'Wallet sync error');
    }
  }, [address, status, currentWalletId, safeConnectWallet, safeHandleDisconnect, isInitialized]);

  // Safe localStorage access with error handling
  const getStoredWalletAddress = useCallback(() => {
    try {
      return localStorage.getItem("walletAddress") || localStorage.getItem("sessionId");
    } catch (err) {
      console.error('🚫 LocalStorage access error:', err);
      return null;
    }
  }, []);

  return {
    isConnected: status === "connected" || !!getStoredWalletAddress(),
    address: address || getStoredWalletAddress(),
    status,
    error,
    isInitialized,
    reconnect: () => {
      const storedAddress = getStoredWalletAddress();
      if (storedAddress) {
        safeConnectWallet(storedAddress);
      }
    }
  };
}