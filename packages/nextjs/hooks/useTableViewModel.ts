import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useGameStore } from "./useGameStore";
import useIsMobile from "./useIsMobile";

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

export function useTableViewModel(timer?: number | null, socket?: WebSocket | null) {
  const {
    players,
    playerHands,
    community,
    joinSeat,
    bigBlind,
    chips,
    currentTurn,
    playerBets,
    playerAction,
    playerStates,
  } = useGameStore();

  const isMobile = useIsMobile();
  const [tableScale, setTableScale] = useState(1);
  const [bet, setBet] = useState(bigBlind);
  // TODO: use minRaise from engine instead of bigBlind (Action Plan 1.2)
  const [actionTimer, setActionTimer] = useState<number | null>(null);
  // TODO: hook into TimerService for server-synced countdowns (Action Plan 1.2)

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

  useEffect(() => {
    if (currentTurn !== null) {
      setActionTimer(10);
    } else {
      setActionTimer(null);
    }
  }, [currentTurn]);

  useEffect(() => {
    if (actionTimer === null || currentTurn === null) return;
    if (actionTimer === 0) {
      const highest = Math.max(...playerBets);
      const myBet = playerBets[currentTurn] ?? 0;
      if (highest > myBet) {
        playerAction({ type: "fold" });
      } else {
        playerAction({ type: "check" });
      }
      setActionTimer(null);
      return;
    }
    const id = setTimeout(() => setActionTimer((t) => (t as number) - 1), 1000);
    return () => clearTimeout(id);
  }, [actionTimer, playerBets, playerAction, currentTurn]);

  const communityCardSize = useMemo(() => {
    return tableScale < 0.75 ? "xs" : tableScale < 1 ? "sm" : "md";
  }, [tableScale]);

  const baseW = isMobile ? 420 : 820;
  const baseH = isMobile ? 680 : 520;
  const highestBet = Math.max(...playerBets);
  const myBet = playerBets[localIdx] ?? 0;
  const myChips = chips[localIdx] ?? 0;
  const toCall = Math.max(0, highestBet - myBet);
  let actions: string[] = [];
  if (currentTurn === localIdx) {
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

  const displayTimer = actionTimer ?? timer ?? 0;

  const handleActionClick = (action: string) => {
    // emit PlayerAction messages via networking contract when socket is available
    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload: any = {
        cmdId: crypto.randomUUID(),
        type: "ACTION",
        action: action.toUpperCase(),
        amount: action === "Bet" || action === "Raise" ? bet : undefined,
        tableId: "demo",
      };
      socket.send(JSON.stringify(payload));
    }
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
    setActionTimer(null);
  };

  const actionDisabled = currentTurn !== localIdx;

  return {
    players,
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
  };
}
