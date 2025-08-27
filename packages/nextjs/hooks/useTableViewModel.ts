import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useGameStore } from "./useGameStore";
import useIsMobile from "./useIsMobile";
import { useWalletGameSync } from "./useWalletGameSync";

interface SeatPos {
  x: string;
  y: string;
  t: string;
  r: number;
}

const buildLayout = (isMobile: boolean): SeatPos[] => {
  const desktop = [
    { x: 75, y: 10 },
    { x: 92, y: 35 },
    { x: 95, y: 65 },
    { x: 80, y: 90 },
    { x: 50, y: 95 },
    { x: 20, y: 90 },
    { x: 5, y: 65 },
    { x: 8, y: 35 },
    { x: 25, y: 10 },
  ];
  const mobile = [
    { x: 85, y: 8 },
    { x: 100, y: 30 },
    { x: 100, y: 72 },
    { x: 88, y: 88 },
    { x: 50, y: 98 },
    { x: 12, y: 88 },
    { x: 0, y: 72 },
    { x: 0, y: 30 },
    { x: 15, y: 8 },
  ];
  const positions = isMobile ? mobile : desktop;
  return positions.map((p) => {
    const angle = Math.atan2(p.y - 50, p.x - 50);
    return {
      x: `${p.x}%`,
      y: `${p.y}%`,
      t: "-50%,-50%",
      r: isMobile ? (angle * 0) / Math.PI : 0,
    };
  });
};

export function useTableViewModel(_timer?: number | null) {
  const {
    players,
    playerIds,
    playerHands,
    community,
    joinSeat,
    bigBlind,
    chips,
    currentTurn,
    playerBets,
    playerAction,
    playerStates,
    dealerIndex,
    timer: serverTimer,
    currentWalletId,
    tableSeats,
    tableId,
  } = useGameStore();

  const isMobile = useIsMobile();
  const [tableScale, setTableScale] = useState(1);
  const [bet, setBet] = useState(bigBlind);
  // TODO: use minRaise from engine instead of bigBlind (Action Plan 1.2)

  useEffect(() => {
    const stack = chips[currentTurn ?? 0] ?? bigBlind;
    setBet(Math.min(bigBlind, stack));
  }, [bigBlind, currentTurn, chips]);

  useEffect(() => {
    const handle = () => {
      const baseW = isMobile ? 420 : 820;
      const baseH = isMobile ? 680 : 520;
      const minTableWidth = isMobile ? 360 : baseW;
      const bottomSpace = isMobile ? 100 : 0;
      const minScale = minTableWidth / baseW;
      const scale = Math.min(
        Math.max(window.innerWidth / baseW, minScale),
        (window.innerHeight - bottomSpace) / baseH,
        1,
      );
      setTableScale(isMobile ? scale * 0.85 : scale);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [isMobile]);

  const layout = useMemo(() => buildLayout(isMobile), [isMobile]);

  const localIdx = useMemo(() => {
    let max = 0;
    for (let i = 1; i < layout.length; i++) {
      if (parseFloat(layout[i].y) > parseFloat(layout[max].y)) max = i;
    }
    return max;
  }, [layout]);

  const { address } = useWalletGameSync();
  const walletSeatIdx = useMemo(() => {
    if (!currentWalletId || !tableId) return -1;
    
    // Check if we have a seat at the current table
    const seatIndex = tableSeats.get(tableId);
    if (seatIndex !== undefined) {
      // Verify the seat is still ours in the current player list
      const playerId = playerIds[seatIndex];
      if (playerId && playerId.toLowerCase() === currentWalletId.toLowerCase()) {
        return seatIndex;
      }
    }
    
    // Fallback: search through playerIds (for compatibility)
    return playerIds.findIndex(
      (id) => id && currentWalletId && id.toLowerCase() === currentWalletId.toLowerCase(),
    );
  }, [playerIds, currentWalletId, tableSeats, tableId]);


  const communityCardSize = useMemo((): "xs" | "sm" | "md" | "lg" => {
    return tableScale < 0.75 ? "xs" : tableScale < 1 ? "sm" : "md";
  }, [tableScale]);

  const baseW = isMobile ? 420 : 820;
  const baseH = isMobile ? 680 : 520;
  const highestBet = Math.max(...playerBets);
  // Use walletSeatIdx instead of localIdx for current player
  const myBet = walletSeatIdx >= 0 ? (playerBets[walletSeatIdx] ?? 0) : 0;
  const myChips = walletSeatIdx >= 0 ? (chips[walletSeatIdx] ?? 0) : 0;
  const toCall = Math.max(0, highestBet - myBet);
  let actions: string[] = [];
  if (currentTurn === walletSeatIdx) {
    actions = ["Fold"];
    if (toCall > 0) {
      actions.push("Call");
      if (myChips > toCall) actions.push("Raise");
    } else {
      actions.push("Check");
      if (myChips > 0) actions.push("Bet");
    }
  }
  const betEnabled = actions.includes("Bet") || actions.includes("Raise");
  const maxBet = myChips;

  const displayTimer = serverTimer;

  const handleActionClick = (action: string) => {
    switch (action) {
      case "Fold":
        playerAction({ type: "fold" });
        break;
      case "Check":
        playerAction({ type: "check" });
        break;
      case "Call":
        playerAction({ type: "call" });
        break;
      case "Bet":
      case "Raise":
        playerAction({ type: "raise", amount: bet });
        break;
    }
  };

  const actionDisabled = currentTurn !== walletSeatIdx;

  return {
    players,
    playerIds,
    playerHands,
    community,
    joinSeat,
    bigBlind,
    chips,
    currentTurn,
    playerBets,
    playerAction,
    playerStates,
    layout,
    localIdx,
    walletSeatIdx,
    tableScale,
    bet,
    setBet,
    communityCardSize,
    baseW,
    baseH,
    actions,
    betEnabled,
    maxBet,
    displayTimer,
    actionDisabled,
    handleActionClick,
    dealerIndex,
  };
}
