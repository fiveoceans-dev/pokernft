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
      const storedAddress = localStorage.getItem("walletAddress");
      
      // Priority 1: Real wallet is connected - always use it
      if (status === "connected" && address) {
        if (address !== currentWalletId) {
          console.log('🔄 Real wallet connected, syncing with game store');
          // Clear any stale localStorage if it doesn't match real wallet
          if (storedAddress && storedAddress !== address) {
            console.log('🧹 Clearing stale localStorage address');
            localStorage.setItem("walletAddress", address);
          }
          safeConnectWallet(address);
        }
        setIsInitialized(true);
        
      // Priority 2: Real wallet disconnected but we have currentWalletId  
      } else if (status === "disconnected" && currentWalletId) {
        
        // Check if stored address matches current wallet ID
        if (storedAddress === currentWalletId) {
          // Stored address matches - this is likely a demo player or valid state
          console.log('🎭 Demo player state maintained');
          
        } else if (!storedAddress) {
          // No stored address - user logged out completely
          console.log('🚪 User logged out completely, handling disconnect');
          safeHandleDisconnect();
          
        } else if (storedAddress !== currentWalletId) {
          // Stored address is different - sync to stored address
          console.log('🔄 Syncing to different stored address');
          safeConnectWallet(storedAddress);
        }
        
      // Priority 3: No real wallet, no current wallet - check for demo player
      } else if (status === "disconnected" && !currentWalletId && !isInitialized) {
        
        if (storedAddress) {
          // We have a stored address (likely demo player)
          console.log('🔄 Found stored demo address on initial load, connecting');
          safeConnectWallet(storedAddress);
        }
        setIsInitialized(true);
      }
      
      // Clear connection timeout and error on successful state changes
      if (connectionTimeoutRef.current && (status === "connected" || !currentWalletId)) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        setError(null);
      }
      
    } catch (err) {
      console.error('🚫 Wallet sync error:', err);
      setError(err instanceof Error ? err.message : 'Wallet sync error');
    }
  }, [address, status, currentWalletId, safeConnectWallet, safeHandleDisconnect, isInitialized]);

  // Safe localStorage access with error handling
  const getStoredWalletAddress = useCallback(() => {
    try {
      return localStorage.getItem("walletAddress");
    } catch (err) {
      console.error('🚫 LocalStorage access error:', err);
      return null;
    }
  }, []);

  return {
    isConnected: status === "connected" || !!currentWalletId,
    // Priority: Real wallet address > Game store current wallet > Stored address
    address: status === "connected" && address ? address : (currentWalletId || getStoredWalletAddress()),
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