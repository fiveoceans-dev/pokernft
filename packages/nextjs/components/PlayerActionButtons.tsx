"use client";

import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { useTableViewModel } from '../hooks/useTableViewModel';
import useIsMobile from '../hooks/useIsMobile';

interface Props {
  isPlayerTurn: boolean;
  currentBet: number;
  playerCommitted: number;
  playerChips: number;
  minRaise?: number;
  isMobile?: boolean;
}

export default function PlayerActionButtons({
  isPlayerTurn,
  currentBet,
  playerCommitted,
  playerChips,
  minRaise = 10,
  isMobile: propIsMobile
}: Props) {
  const { playerAction, connectionState } = useGameStore();
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [isActionPending, setIsActionPending] = useState(false);
  const hookIsMobile = useIsMobile();
  const isMobile = propIsMobile ?? hookIsMobile;

  // Always render container to preserve space - content visibility controlled below
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

  const showActions = isPlayerTurn && connectionState !== 'disconnected';

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 w-full h-full border border-gray-600/30 text-xs flex flex-col transition-all duration-300">
      {/* Row 1 - Action Buttons (Fixed positions) */}
      <div className="flex justify-center gap-1 mb-2" style={{minHeight: '36px'}}>
        {/* Fold - Position 1 */}
        <div className="flex justify-center" style={{minWidth: '70px'}}>
          {showActions ? (
            <button
              onClick={() => handleAction('fold')}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending 
                  ? 'bg-gray-600 hover:bg-gray-700 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              Fold
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">Fold</div>
          )}
        </div>
        
        {/* Check - Position 2 */}
        <div className="flex justify-center" style={{minWidth: '70px'}}>
          {showActions && canCheck ? (
            <button
              onClick={() => handleAction('check')}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Check
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">Check</div>
          )}
        </div>
        
        {/* Call - Position 3 */}
        <div className="flex justify-center" style={{minWidth: '70px'}}>
          {showActions && canCall ? (
            <button
              onClick={() => handleAction('call')}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? 'bg-green-600 hover:bg-green-700 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Call {toCall}
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">Call</div>
          )}
        </div>
        
        {/* Bet - Position 4 */}
        <div className="flex justify-center" style={{minWidth: '70px'}}>
          {showActions && canRaise && toCall === 0 ? (
            <button
              onClick={() => handleAction('raise', raiseAmount)}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Bet
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">Bet</div>
          )}
        </div>
        
        {/* Raise - Position 5 */}
        <div className="flex justify-center" style={{minWidth: '70px'}}>
          {showActions && canRaise && toCall > 0 ? (
            <button
              onClick={() => handleAction('raise', raiseAmount)}
              disabled={isActionPending}
              className={`min-w-[70px] px-3 py-1.5 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${
                isActionPending
                  ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Raise
            </button>
          ) : (
            <div className="min-w-[70px] px-3 py-1.5 opacity-0 pointer-events-none">Raise</div>
          )}
        </div>
      </div>

      {/* Row 2 - Quick Bet Buttons (Right aligned) */}
      <div className="flex justify-end items-center gap-1 mb-2" style={{minHeight: '32px'}}>
        {showActions && canRaise && maxRaise > minRaise ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRaiseAmount(Math.min(minRaise * 2, maxRaise))}
              className="min-w-[50px] px-2 py-1 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              disabled={minRaise * 2 > maxRaise}
            >
              2BB
            </button>
            <button
              onClick={() => setRaiseAmount(Math.min(minRaise * 3, maxRaise))}
              className="min-w-[50px] px-2 py-1 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              disabled={minRaise * 3 > maxRaise}
            >
              3BB
            </button>
            <button
              onClick={() => setRaiseAmount(maxRaise)}
              className="min-w-[60px] px-2 py-1 rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              disabled={maxRaise <= minRaise}
            >
              All-in
            </button>
          </div>
        ) : (
          <div className="opacity-0 pointer-events-none flex items-center gap-1">
            <div className="min-w-[50px] px-2 py-1 text-xs">2BB</div>
            <div className="min-w-[50px] px-2 py-1 text-xs">3BB</div>
            <div className="min-w-[60px] px-2 py-1 text-xs">All-in</div>
          </div>
        )}
      </div>

      {/* Row 3 - Betting Controls (Full width) */}
      <div className="flex items-center gap-1 w-full" style={{minHeight: '32px'}}>
        {showActions && canRaise && maxRaise > minRaise ? (
          <>
            {/* Minus Button */}
            <button
              onClick={() => {
                const newAmount = Math.max(raiseAmount - minRaise, minRaise);
                setRaiseAmount(newAmount);
              }}
              disabled={raiseAmount <= minRaise}
              className="w-7 h-7 flex items-center justify-center rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            
            {/* Betting Slider - Full width */}
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            
            {/* Plus Button */}
            <button
              onClick={() => {
                const newAmount = Math.min(raiseAmount + minRaise, maxRaise);
                setRaiseAmount(newAmount);
              }}
              disabled={raiseAmount >= maxRaise}
              className="w-7 h-7 flex items-center justify-center rounded font-medium transition-all duration-200 text-white shadow-sm hover:shadow-md transform hover:scale-105 bg-black/40 hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
            
            {/* Bet Amount Input */}
            <input
              type="number"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={handleRaiseAmountChange}
              className="w-16 px-2 py-1 bg-black/40 text-white rounded text-center hover:bg-black/60 transition-colors text-sm"
            />
          </>
        ) : (
          <div className="opacity-0 pointer-events-none flex items-center gap-1 w-full">
            <div className="w-7 h-7">-</div>
            <div className="flex-1 h-2">slider</div>
            <div className="w-7 h-7">+</div>
            <div className="w-16 px-2 py-1">input</div>
          </div>
        )}
      </div>
    </div>
  );
}