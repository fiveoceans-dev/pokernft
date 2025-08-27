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
    playerIds
  } = useGameStore();

  return useMemo(() => {
    // Find the current player's seat using case-insensitive comparison
    const mySeatIndex = playerIds.findIndex(id => 
      id && walletId && id.toLowerCase() === walletId.toLowerCase()
    );
    const isMyTurn = mySeatIndex >= 0 && currentTurn === mySeatIndex;
    const myChips = mySeatIndex >= 0 ? (chips[mySeatIndex] || 0) : 0;
    const myCurrentBet = mySeatIndex >= 0 ? (playerBets[mySeatIndex] || 0) : 0;

    // Calculate the current betting state
    const maxBet = Math.max(...playerBets);
    const betToCall = maxBet - myCurrentBet;
    const canCheck = betToCall === 0;
    const canBet = maxBet === 0; // No one has bet yet in this round
    const minRaise = Math.max(maxBet * 2, 50); // Min raise is double current bet or big blind

    const actions: PokerAction[] = [
      {
        type: "fold",
        label: "Fold",
        enabled: isMyTurn && !canCheck,
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
      },
      {
        type: "all-in",
        label: `All-in $${myChips}`,
        enabled: isMyTurn && myChips > 0,
        amount: myChips,
      }
    ];

    return actions;
  }, [currentTurn, playerBets, chips, walletId, playerIds]);
}