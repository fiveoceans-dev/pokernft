import React from "react";
import { useWalletGameSync } from "../hooks/useWalletGameSync";
import { useGameStore } from "../hooks/useGameStore";

interface WalletErrorHandlerProps {
  children: React.ReactNode;
}

export function WalletErrorHandler({ children }: WalletErrorHandlerProps) {
  const { error: walletSyncError, reconnect } = useWalletGameSync();
  const { connectionError } = useGameStore();

  // Determine the most critical error to display
  const activeError = walletSyncError || connectionError;

  if (!activeError) {
    return <>{children}</>;
  }

  const getErrorInfo = (error: string) => {
    if (error.includes('timeout')) {
      return {
        title: 'Connection Timeout',
        message: 'The wallet connection is taking longer than expected.',
        actions: ['retry', 'refresh']
      };
    }
    
    if (error.includes('Invalid wallet address')) {
      return {
        title: 'Invalid Wallet',
        message: 'There was an issue with your wallet address.',
        actions: ['reconnect', 'refresh']
      };
    }
    
    if (error.includes('Failed to attach wallet')) {
      return {
        title: 'Wallet Attachment Failed', 
        message: 'Unable to connect your wallet to the game server.',
        actions: ['retry', 'reconnect']
      };
    }
    
    if (error.includes('Not connected to game server')) {
      return {
        title: 'Server Connection Lost',
        message: 'Lost connection to the game server.',
        actions: ['retry', 'refresh']
      };
    }

    if (error.includes('Failed to send action')) {
      return {
        title: 'Action Failed',
        message: 'Unable to send your action to the server.',
        actions: ['retry']
      };
    }

    // Default error
    return {
      title: 'Wallet Error',
      message: error,
      actions: ['retry', 'refresh']
    };
  };

  const handleRetry = () => {
    reconnect();
  };

  const handleReconnectWallet = () => {
    // Clear localStorage and force wallet reconnection
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('sessionId');
    window.location.reload();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const errorInfo = getErrorInfo(activeError);

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50 max-w-sm bg-red-500/90 backdrop-blur-sm border border-red-400/20 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="text-red-300 text-lg">⚠️</div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">
              {errorInfo.title}
            </h3>
            <p className="text-red-100 text-xs mb-3 leading-relaxed">
              {errorInfo.message}
            </p>
            <div className="flex gap-2">
              {errorInfo.actions.includes('retry') && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded font-medium transition-colors"
                >
                  Retry
                </button>
              )}
              {errorInfo.actions.includes('reconnect') && (
                <button
                  onClick={handleReconnectWallet}
                  className="px-3 py-1 bg-blue-500/80 hover:bg-blue-500/90 text-white text-xs rounded font-medium transition-colors"
                >
                  Reconnect
                </button>
              )}
              {errorInfo.actions.includes('refresh') && (
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1 bg-gray-500/80 hover:bg-gray-500/90 text-white text-xs rounded font-medium transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}