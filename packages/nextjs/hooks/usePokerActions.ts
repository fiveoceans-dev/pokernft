import { useMemo } from "react";
import { useGameStore } from "./useGameStore";

export interface PokerAction {
  type: "fold" | "check" | "call" | "bet" | "raise" | "all-in";
  label: string;
  enabled: boolean;
  amount?: number;
}

export function usePokerActions() {
  const { 
    currentTurn, 
    playerBets, 
    chips, 
    walletId, 
    playerIds, 
    players 
  } = useGameStore();

  return useMemo(() => {
    // Find the current player's seat
    const mySeatIndex = playerIds.findIndex(id => id === walletId);
    const isMyTurn = currentTurn === mySeatIndex;
    const myChips = chips[mySeatIndex] || 0;
    const myCurrentBet = playerBets[mySeatIndex] || 0;
    
    if (!isMyTurn || mySeatIndex === -1 || !players[mySeatIndex]) {
      return [];
    }

    // Calculate the current betting state
    const maxBet = Math.max(...playerBets);
    const betToCall = maxBet - myCurrentBet;
    const canCheck = betToCall === 0;
    const canBet = maxBet === 0; // No one has bet yet in this round
    const minRaise = Math.max(maxBet * 2, 50); // Min raise is double current bet or big blind
    
    const actions: PokerAction[] = [];

    // Fold - always available (unless you can check for free)
    if (!canCheck) {
      actions.push({
        type: "fold",
        label: "Fold",
        enabled: true,
      });
    }

    // Check - available when no bet to call
    if (canCheck) {
      actions.push({
        type: "check",
        label: "Check",
        enabled: true,
      });
    }

    // Call - available when there's a bet to call
    if (betToCall > 0 && myChips >= betToCall) {
      actions.push({
        type: "call",
        label: `Call $${betToCall}`,
        enabled: true,
        amount: betToCall,
      });
    }

    // Bet - available when no one has bet yet
    if (canBet && myChips >= 50) {
      actions.push({
        type: "bet",
        label: "Bet",
        enabled: true,
      });
    }

    // Raise - available when there's already a bet
    if (betToCall > 0 && myChips >= minRaise) {
      actions.push({
        type: "raise",
        label: "Raise",
        enabled: true,
      });
    }

    // All-in - always available when you have chips
    if (myChips > 0) {
      actions.push({
        type: "all-in",
        label: `All-in $${myChips}`,
        enabled: true,
        amount: myChips,
      });
    }

    return actions;
  }, [currentTurn, playerBets, chips, walletId, playerIds, players]);
}