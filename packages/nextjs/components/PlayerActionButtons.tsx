"use client";

import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { useTableViewModel } from '../hooks/useTableViewModel';

interface Props {
  isPlayerTurn: boolean;
  currentBet: number;
  playerCommitted: number;
  playerChips: number;
  minRaise?: number;
}

export default function PlayerActionButtons({
  isPlayerTurn,
  currentBet,
  playerCommitted,
  playerChips,
  minRaise = 10
}: Props) {
  const { playerAction, connectionState } = useGameStore();
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [isActionPending, setIsActionPending] = useState(false);

  if (!isPlayerTurn || connectionState === 'disconnected') {
    return null;
  }

  const toCall = Math.max(0, currentBet - playerCommitted);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && toCall <= playerChips;
  const canRaise = playerChips > toCall + minRaise;
  const maxRaise = playerChips - toCall;

  const handleAction = async (action: string, amount?: number) => {
    if (isActionPending) return;
    
    setIsActionPending(true);
    try {
      await playerAction({ type: action as any, amount });
      console.log(`✅ Player action: ${action}${amount ? ` (${amount})` : ''}`);
    } catch (error) {
      console.error(`❌ Action failed: ${action}`, error);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRaiseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minRaise;
    setRaiseAmount(Math.max(minRaise, Math.min(value, maxRaise)));
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
      <div className="flex flex-col gap-2 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
        {/* Bet size display */}
        <div className="text-center text-white text-sm">
          {toCall > 0 ? `Call: ${toCall}` : 'Action to you'}
          {canRaise && ` | Chips: ${playerChips}`}
        </div>
        
        {/* Action buttons row */}
        <div className="flex gap-2">
          {/* Fold button */}
          <button
            onClick={() => handleAction('fold')}
            disabled={isActionPending}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              isActionPending 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
            }`}
          >
            Fold
          </button>

          {/* Check/Call button */}
          {canCheck ? (
            <button
              onClick={() => handleAction('check')}
              disabled={isActionPending}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isActionPending
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
              }`}
            >
              Check
            </button>
          ) : canCall ? (
            <button
              onClick={() => handleAction('call')}
              disabled={isActionPending}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isActionPending
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
              }`}
            >
              Call {toCall}
            </button>
          ) : null}

          {/* Raise/Bet button */}
          {canRaise && (
            <div className="flex gap-1">
              <input
                type="number"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={handleRaiseAmountChange}
                disabled={isActionPending}
                className="w-16 px-2 py-2 rounded-l-lg bg-gray-800 text-white text-center text-sm border border-gray-600 focus:border-yellow-500 outline-none"
              />
              <button
                onClick={() => handleAction('raise', raiseAmount)}
                disabled={isActionPending}
                className={`px-4 py-2 rounded-r-lg font-semibold transition-all ${
                  isActionPending
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white active:scale-95'
                }`}
              >
                {toCall > 0 ? 'Raise' : 'Bet'}
              </button>
            </div>
          )}

          {/* All-in button (if player has chips but can't afford normal raise) */}
          {!canRaise && playerChips > toCall && (
            <button
              onClick={() => handleAction('raise', playerChips - toCall)}
              disabled={isActionPending}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isActionPending
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
              }`}
            >
              All-in
            </button>
          )}
        </div>

        {/* Timer indicator (placeholder for now) */}
        <div className="text-center text-gray-400 text-xs">
          Your turn - make your move
        </div>
      </div>
    </div>
  );
}