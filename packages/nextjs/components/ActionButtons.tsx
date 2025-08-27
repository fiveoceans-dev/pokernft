import React, { useState } from "react";
import { usePokerActions, PokerAction } from "../hooks/usePokerActions";
import { useGameStore } from "../hooks/useGameStore";
import { withErrorBoundary } from "./ErrorBoundary";

function ActionButtons() {
  const actions = usePokerActions();
  const { playerAction, bigBlind, chips, playerIds, currentWalletId, playerBets } = useGameStore();
  
  // Debug logging
  console.log("🎮 ActionButtons render:", {
    actionsCount: actions?.length || 0,
    actions: actions?.map(a => ({ type: a.type, enabled: a.enabled })) || [],
    currentWalletId: currentWalletId?.slice(0, 10) + "...",
    hasPlayerAction: !!playerAction
  });
  
  // Defensive checks for all store values
  const safePlayerIds = Array.isArray(playerIds) ? playerIds : [];
  const safeChips = Array.isArray(chips) ? chips : [];
  const safePlayerBets = Array.isArray(playerBets) ? playerBets : [];
  const safeBigBlind = typeof bigBlind === 'number' && bigBlind > 0 ? bigBlind : 50;
  
  const mySeatIndex = safePlayerIds.findIndex(id => 
    id && currentWalletId && typeof id === 'string' && typeof currentWalletId === 'string' &&
    id.toLowerCase() === currentWalletId.toLowerCase()
  );
  
  const myChips = mySeatIndex >= 0 && mySeatIndex < safeChips.length ? (safeChips[mySeatIndex] || 0) : 0;
  const maxBet = Math.max(myChips, safeBigBlind);
  
  // Determine if there are existing bets to determine Bet vs Raise
  const maxCurrentBet = Math.max(0, ...safePlayerBets);
  const isPreflop = maxCurrentBet === safeBigBlind; // Only big blind posted
  const hasExistingBets = maxCurrentBet > (isPreflop ? safeBigBlind : 0);
  
  const [betAmount, setBetAmount] = useState(safeBigBlind);

  // Update bet amount if big blind changes
  React.useEffect(() => {
    setBetAmount(safeBigBlind);
  }, [safeBigBlind]);
  
  // Show waiting state if no actions available (after all hooks)
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="text-gray-400 text-sm">
          Waiting for turn...
        </div>
      </div>
    );
  }

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

  const handleSliderClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const sliderWidth = rect.width;
    
    // Calculate the percentage position of the click
    const clickPercentage = clickX / sliderWidth;
    
    // Calculate what value this click position represents
    const clickValue = safeBigBlind + (maxBet - safeBigBlind) * clickPercentage;
    
    // Determine if click was left or right of current handle position
    if (clickValue < betAmount - (safeBigBlind / 2)) {
      // Clicked left of handle - decrease by big blind amount
      const newAmount = Math.max(betAmount - safeBigBlind, safeBigBlind);
      setBetAmount(newAmount);
    } else if (clickValue > betAmount + (safeBigBlind / 2)) {
      // Clicked right of handle - increase by big blind amount
      const newAmount = Math.min(betAmount + safeBigBlind, maxBet);
      setBetAmount(newAmount);
    }
    // If click is very close to current position (within half a big blind), do nothing
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Action Buttons - hide disabled buttons but maintain layout spacing */}
      <div className="flex gap-2 flex-wrap justify-center min-h-[40px]">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={action.enabled ? () => handleAction(action as PokerAction) : undefined}
            style={{ visibility: action.enabled ? 'visible' : 'hidden' }}
            className={`
              px-4 py-2 rounded font-medium transition-all duration-200
              bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105
              ${action.type === "fold" ? "bg-gray-600 hover:bg-gray-700" : ""}
              ${action.type === "check" ? "bg-blue-600 hover:bg-blue-700" : ""}
              ${action.type === "call" ? "bg-green-600 hover:bg-green-700" : ""}
            `}
          >
            {/* Update button labels for proper Bet vs Raise */}
            {action.type === "bet" 
              ? (hasExistingBets ? "Raise" : "Bet")
              : action.label
            }
          </button>
        ))}
      </div>

      {/* Betting Slider - clean minimal design with plus/minus buttons */}
      {actions.some(a => a && (a.type === "bet" || a.type === "raise")) && maxBet > safeBigBlind && (
        <div className="flex items-center gap-2">
          {/* Minus 1BB Button */}
          <button
            onClick={() => {
              const newAmount = Math.max(betAmount - safeBigBlind, safeBigBlind);
              setBetAmount(newAmount);
            }}
            disabled={betAmount <= safeBigBlind}
            className="w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          
          {/* Betting Slider */}
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
            onClick={handleSliderClick}
            className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          
          {/* Plus 1BB Button */}
          <button
            onClick={() => {
              const newAmount = Math.min(betAmount + safeBigBlind, maxBet);
              setBetAmount(newAmount);
            }}
            disabled={betAmount >= maxBet}
            className="w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
          
          {/* Bet Amount Input Field - styled to match All-In button */}
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
            className="w-20 px-2 py-1 bg-black/60 text-white rounded text-center hover:bg-black/80 transition-colors"
          />
        </div>
      )}

      {/* Quick Bet Buttons */}
      {actions.some(a => a && (a.type === "bet" || a.type === "raise")) && maxBet > safeBigBlind && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newAmount = Math.min(safeBigBlind * 2, maxBet);
              setBetAmount(newAmount);
            }}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
            disabled={safeBigBlind * 2 > maxBet}
          >
            2BB
          </button>
          <button
            onClick={() => {
              const newAmount = Math.min(safeBigBlind * 3, maxBet);
              setBetAmount(newAmount);
            }}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
            disabled={safeBigBlind * 3 > maxBet}
          >
            3BB
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