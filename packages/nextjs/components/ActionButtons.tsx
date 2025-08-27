import React, { useState } from "react";
import { usePokerActions, PokerAction } from "../hooks/usePokerActions";
import { useGameStore } from "../hooks/useGameStore";
import { withErrorBoundary } from "./ErrorBoundary";

function ActionButtons() {
  const actions = usePokerActions();
  const { playerAction, bigBlind, chips, playerIds, currentWalletId } = useGameStore();
  
  // Early return if critical data is not available
  if (!actions || !Array.isArray(actions)) {
    return null;
  }
  
  // Defensive checks for all store values
  const safePlayerIds = Array.isArray(playerIds) ? playerIds : [];
  const safeChips = Array.isArray(chips) ? chips : [];
  const safeBigBlind = typeof bigBlind === 'number' && bigBlind > 0 ? bigBlind : 50;
  
  const mySeatIndex = safePlayerIds.findIndex(id => 
    id && currentWalletId && typeof id === 'string' && typeof currentWalletId === 'string' &&
    id.toLowerCase() === currentWalletId.toLowerCase()
  );
  
  const myChips = mySeatIndex >= 0 && mySeatIndex < safeChips.length ? (safeChips[mySeatIndex] || 0) : 0;
  const maxBet = Math.max(myChips, safeBigBlind);
  
  const [betAmount, setBetAmount] = useState(safeBigBlind);

  // Update bet amount if big blind changes
  React.useEffect(() => {
    setBetAmount(safeBigBlind);
  }, [safeBigBlind]);

  const handleAction = (action: PokerAction) => {
    // Defensive check for playerAction function
    if (!playerAction || typeof playerAction !== 'function') {
      console.error("🚫 playerAction function not available");
      return;
    }

    if (!action || !action.type) {
      console.error("🚫 Invalid action", action);
      return;
    }

    try {
      let amount = action.amount;
      
      // For bet/raise actions, use the slider amount
      if (action.type === "bet" || action.type === "raise") {
        amount = betAmount;
      }

      // Send action to server via WebSocket
      const actionType = action.type === "bet" ? "raise" : action.type;
      console.log("🎯 Sending action:", { actionType, amount });
      
      playerAction({ type: actionType as "fold" | "call" | "raise" | "check", amount });
    } catch (error) {
      console.error("🚫 Error handling action:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={action.enabled ? () => handleAction(action) : undefined}
            disabled={!action.enabled}
            className={`
              px-4 py-2 rounded font-medium transition-all duration-200
              ${action.enabled
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105" 
                : "bg-gray-500 text-gray-300 cursor-not-allowed opacity-50"
              }
              ${action.type === "fold" ? "bg-gray-600 hover:bg-gray-700" : ""}
              ${action.type === "check" ? "bg-blue-600 hover:bg-blue-700" : ""}
              ${action.type === "call" ? "bg-green-600 hover:bg-green-700" : ""}
            `}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Betting Slider - only show for bet/raise actions */}
      {actions.some(a => a && (a.type === "bet" || a.type === "raise")) && maxBet > safeBigBlind && (
        <div className="flex items-center gap-3">
          <span className="text-white text-sm min-w-[40px]">${safeBigBlind}</span>
          <input
            type="range"
            min={safeBigBlind}
            max={maxBet}
            value={Math.min(Math.max(betAmount, safeBigBlind), maxBet)}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value) && value >= safeBigBlind && value <= maxBet) {
                setBetAmount(value);
              }
            }}
            className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-white text-sm min-w-[60px]">${maxBet}</span>
          <input
            type="number"
            min={safeBigBlind}
            max={maxBet}
            value={Math.min(Math.max(betAmount, safeBigBlind), maxBet)}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value) && value >= safeBigBlind) {
                setBetAmount(Math.min(value, maxBet));
              }
            }}
            className="w-20 px-2 py-1 text-black rounded text-center"
          />
        </div>
      )}

      {/* Quick Bet Buttons */}
      {actions.some(a => a && (a.type === "bet" || a.type === "raise")) && maxBet > safeBigBlind && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newAmount = Math.min(betAmount * 2, maxBet);
              if (newAmount >= safeBigBlind) {
                setBetAmount(newAmount);
              }
            }}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
            disabled={betAmount * 2 < safeBigBlind}
          >
            2x
          </button>
          <button
            onClick={() => {
              const newAmount = Math.min(betAmount * 3, maxBet);
              if (newAmount >= safeBigBlind) {
                setBetAmount(newAmount);
              }
            }}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
            disabled={betAmount * 3 < safeBigBlind}
          >
            3x
          </button>
          <button
            onClick={() => setBetAmount(maxBet)}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
            disabled={maxBet <= safeBigBlind}
          >
            All-in
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap with error boundary for better error handling
export default withErrorBoundary(
  ActionButtons,
  <div className="flex items-center justify-center p-4 text-red-400">
    ⚠️ Action buttons temporarily unavailable
  </div>
);