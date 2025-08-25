import { useState } from "react";
import { usePokerActions, PokerAction } from "../hooks/usePokerActions";
import { useGameStore } from "../hooks/useGameStore";

export default function ActionButtons() {
  const actions = usePokerActions();
  const { playerAction, bigBlind, chips, playerIds, walletId } = useGameStore();
  
  const mySeatIndex = playerIds.findIndex(id => id === walletId);
  const myChips = chips[mySeatIndex] || 0;
  const maxBet = Math.max(myChips, bigBlind);
  
  const [betAmount, setBetAmount] = useState(bigBlind);

  const handleAction = (action: PokerAction) => {
    let amount = action.amount;
    
    // For bet/raise actions, use the slider amount
    if (action.type === "bet" || action.type === "raise") {
      amount = betAmount;
    }

    // Send action to server via WebSocket
    playerAction(action.type, amount);
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleAction(action)}
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
              ${action.type === "all-in" ? "bg-purple-600 hover:bg-purple-700" : ""}
            `}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Betting Slider - only show for bet/raise actions */}
      {actions.some(a => a.type === "bet" || a.type === "raise") && (
        <div className="flex items-center gap-3">
          <span className="text-white text-sm min-w-[40px]">${bigBlind}</span>
          <input
            type="range"
            min={bigBlind}
            max={maxBet}
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-white text-sm min-w-[60px]">${maxBet}</span>
          <input
            type="number"
            min={bigBlind}
            max={maxBet}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.min(Number(e.target.value), maxBet))}
            className="w-20 px-2 py-1 text-black rounded text-center"
          />
        </div>
      )}

      {/* Quick Bet Buttons */}
      {actions.some(a => a.type === "bet" || a.type === "raise") && (
        <div className="flex gap-2">
          <button
            onClick={() => setBetAmount(Math.min(betAmount * 2, maxBet))}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
          >
            2x
          </button>
          <button
            onClick={() => setBetAmount(Math.min(betAmount * 3, maxBet))}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
          >
            3x
          </button>
          <button
            onClick={() => setBetAmount(maxBet)}
            className="px-3 py-1 bg-black/60 text-white rounded hover:bg-black/80 transition-colors"
          >
            All-in
          </button>
        </div>
      )}
    </div>
  );
}