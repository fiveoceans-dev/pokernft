import { useMemo } from "react";
import { useGameStore } from "./useGameStore";

export interface PokerAction {
  type: "fold" | "check" | "call" | "bet" | "raise";
  label: string;
  enabled: boolean;
  amount?: number;
}

export function usePokerActions() {
  const {
    currentTurn,
    playerBets,
    chips,
    currentWalletId,
    playerIds
  } = useGameStore();

  return useMemo(() => {
    // Early return with empty actions if critical data is not available
    if (!currentWalletId || !playerIds || !playerBets || !chips) {
      return [];
    }

    // Defensive checks for array integrity
    const safePlayerIds = Array.isArray(playerIds) ? playerIds : [];
    const safePlayerBets = Array.isArray(playerBets) ? playerBets : [];
    const safeChips = Array.isArray(chips) ? chips : [];

    // Find the current player's seat using case-insensitive comparison
    const mySeatIndex = safePlayerIds.findIndex(id => 
      id && currentWalletId && typeof id === 'string' && typeof currentWalletId === 'string' && 
      id.toLowerCase() === currentWalletId.toLowerCase()
    );
    
    // If we can't find the player, return empty actions
    if (mySeatIndex < 0) {
      return [];
    }

    const isMyTurn = currentTurn === mySeatIndex;
    const myChips = mySeatIndex < safeChips.length ? (safeChips[mySeatIndex] || 0) : 0;
    const myCurrentBet = mySeatIndex < safePlayerBets.length ? (safePlayerBets[mySeatIndex] || 0) : 0;

    // Calculate the current betting state with defensive checks
    const maxBet = safePlayerBets.length > 0 ? Math.max(...safePlayerBets.filter(bet => typeof bet === 'number' && !isNaN(bet))) : 0;
    const betToCall = Math.max(0, maxBet - myCurrentBet);

    // Debug logging for action button issues
    if (currentWalletId) {
      console.log("🎮 usePokerActions DEBUG:", {
        currentWalletId: currentWalletId.slice(0, 10) + "...",
        mySeatIndex,
        currentTurn,
        isMyTurn,
        myChips,
        myCurrentBet,
        maxBet,
        betToCall,
        playerIds: playerIds.map((id, i) => ({ 
          i, 
          id: id?.slice(0, 10) + "...",
          chips: chips[i] || 0,
          bet: playerBets[i] || 0
        })),
      });
    }
    const canCheck = betToCall === 0;
    const canBet = maxBet === 0; // No one has bet yet in this round
    const minRaise = Math.max(maxBet + 50, 50); // Min raise is previous bet + big blind, minimum 50

    // Safety check: if we don't have chips data, return limited actions
    if (myChips < 0) {
      return [{
        type: "fold",
        label: "Fold",
        enabled: false,
      }];
    }

    const actions: PokerAction[] = [
      {
        type: "fold",
        label: "Fold",
        enabled: isMyTurn && betToCall > 0, // Can always fold when facing a bet
      },
      {
        type: "check",
        label: "Check",
        enabled: isMyTurn && canCheck,
      },
      {
        type: "call",
        label: `Call $${betToCall}`,
        enabled: isMyTurn && betToCall > 0 && myChips >= betToCall,
        amount: betToCall,
      },
      {
        type: "bet",
        label: "Bet",
        enabled: isMyTurn && canBet && myChips >= 50,
      },
      {
        type: "raise",
        label: "Raise",
        enabled: isMyTurn && betToCall > 0 && myChips >= minRaise,
      }
    ];

    // Additional logging for action states (only when it's my turn to avoid spam)
    if (currentWalletId && isMyTurn) {
      console.log("🎯 Action buttons state:", {
        mySeatIndex,
        currentTurn,
        myChips,
        myCurrentBet,
        maxBet,
        betToCall,
        canFold: betToCall > 0,
        canCheck: canCheck,
        canCall: betToCall > 0 && myChips >= betToCall,
        canBet: canBet && myChips >= 50,
        canRaise: betToCall > 0 && myChips >= minRaise,
        actions: actions.map(a => ({ type: a.type, enabled: a.enabled }))
      });
    }

    return actions;
  }, [currentTurn, playerBets, chips, currentWalletId, playerIds]);
}