import React from "react";
import { useGameStore } from "../hooks/useGameStore";

export function ConnectionStatus() {
  const { connectionState, connectionError } = useGameStore();

  if (connectionState === 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        Online
      </div>
    );
  }

  if (connectionState === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-spin"></div>
        Connecting
      </div>
    );
  }

  if (connectionState === 'reconnecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
        Connecting
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
      <span>Offline</span>
      {connectionError && (
        <span className="text-xs opacity-75">({connectionError})</span>
      )}
    </div>
  );
}