// src/components/Table.tsx

import { useEffect, useState, useMemo, Fragment } from "react";
import type { CSSProperties } from "react";
import { useGameStore } from "../hooks/useGameStore";
import useIsMobile from "../hooks/useIsMobile";
import Card from "./Card";
import { indexToCard } from "../backend";
import PlayerSeat from "./PlayerSeat";
import type { UiPlayer, Card as TCard } from "../backend";

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

/* ─────────────────────────────────────────────────────── */

export default function Table({ timer }: { timer?: number | null }) {
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
  } = useGameStore();
  const isMobile = useIsMobile();
  const [tableScale, setTableScale] = useState(1);
  const [bet, setBet] = useState(bigBlind);
  const [actionTimer, setActionTimer] = useState<number | null>(null);

  useEffect(() => {
    setBet(bigBlind);
  }, [bigBlind, currentTurn]);

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
      setTableScale(scale);
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

  const holeCardSize = "sm";

  /* helper – render a seat or an empty placeholder */
  const seatAt = (idx: number) => {
    const nickname = players[idx];
    const handCodes = playerHands[idx];
    const pos = layout[idx];
    if (!pos) return null;
    const posStyle = {
      left: pos.x,
      top: pos.y,
      transform: `translate(${pos.t})`,
    } as CSSProperties;

    const dx = 50 - parseFloat(pos.x);
    const dy = 50 - parseFloat(pos.y);
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = 40;
    const dealerOffset = { x: (dx / mag) * offset, y: (dy / mag) * offset };
    /* ── empty seat → button ─────────────────────────────── */
    if (!nickname) {
      const badge = (
        <span
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full
                    bg-black/60 text-white text-xs flex items-center justify-center
                    pointer-events-none"
        >
          {idx + 1}
        </span>
      );
      return (
        <div key={idx} style={posStyle} className="absolute">
          <div>
            {badge}
            <button
              onClick={() => joinSeat(idx)}
              className="w-24 h-8 flex items-center justify-center rounded text-xs text-gray-300 border border-dashed border-gray-500 bg-black/20 transition-colors duration-150 hover:bg-red-500 hover:text-white"
            >
              Play
            </button>
          </div>
        </div>
      );
    }

    /* ── occupied seat ───────────────────────────────────── */
    const hand: [TCard, TCard] | null = handCodes
      ? [indexToCard(handCodes[0]), indexToCard(handCodes[1])]
      : null;

    const player: UiPlayer = {
      name: nickname,
      chips: chips[idx] ?? 0,
      hand,
      folded: false,
      currentBet: playerBets[idx] ?? 0,
    };
    const isDealer = idx === 1;
    const isActive = idx === currentTurn;
    const reveal = idx === localIdx;

    const badge = (
      <span
        className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-20 px-2 rounded-full
                  bg-black/60 text-white text-xs flex items-center justify-center
                  font-mono tabular-nums whitespace-nowrap pointer-events-none"
      >
        {/* show bet if you prefer: `$${player.currentBet}` */}
        {`$${player.chips.toLocaleString()}`}
      </span>
    );

    const betX = (parseFloat(pos.x) + 50) / 2;
    const betY = (parseFloat(pos.y) + 50) / 2;
    const betStyle = {
      left: `${betX}%`,
      top: `${betY}%`,
      transform: "translate(-50%, -50%)",
    } as CSSProperties;
    const betAmount = player.currentBet;
    let betBg = "bg-yellow-500";
    if (betAmount > 1000) betBg = "bg-black";
    else if (betAmount > 500) betBg = "bg-blue-500";
    else if (betAmount > 250) betBg = "bg-red-500";
    else if (betAmount > 100) betBg = "bg-green-500";

    return (
      <Fragment key={idx}>
        <div style={posStyle} className="absolute">
          <div className="relative">
            {badge}
            <div style={{ transform: `rotate(${pos.r}deg)` }}>
              <PlayerSeat
                player={player}
                isDealer={isDealer}
                isActive={isActive}
                revealCards={reveal}
                cardSize={holeCardSize}
                dealerOffset={dealerOffset}
              />
            </div>
          </div>
        </div>
        {betAmount > 0 && (
          <div
            style={betStyle}
            className={`absolute w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs text-white font-semibold ${betBg}`}
          >
            ${betAmount}
          </div>
        )}
      </Fragment>
    );
  };

  const bankEl = (
    <div key="bank" className="absolute left-1/2 -translate-x-1/2 top-[5px]">
      <div className="relative flex justify-center">
        <div className="w-24 h-12 flex items-center justify-center rounded bg-[var(--color-accent)] border-4 border-yellow-700 text-black">
          BANK
        </div>
      </div>
    </div>
  );

  /* community cards – only reveal dealt streets */
  const visibleCommunity = community.filter((c): c is number => c !== null);
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center gap-2 w-full">
      {visibleCommunity.map((code, i) => (
        <Card key={i} card={indexToCard(code)} size={communityCardSize} />
      ))}
    </div>
  );

  const baseW = isMobile ? 420 : 820;
  const baseH = isMobile ? 680 : 520;
  const maxBet = chips[currentTurn ?? localIdx] ?? bigBlind;

  const displayTimer = actionTimer ?? timer ?? 0;

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
    setActionTimer(null);
  };

  const actionDisabled = currentTurn === null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-3xl font-mono">
        {displayTimer.toString().padStart(2, "0")}
      </div>
      {/* poker-table oval */}
      <div
        className="relative rounded-full border-8 border-[var(--brand-accent)] bg-main shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(${tableScale})`,
          transformOrigin: "center",
        }}
      >
        {communityRow}
        {bankEl}
        {/* seats */}
        {layout.map((_, i) => seatAt(i))}
      </div>
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {["Fold", "Check", "Call", "Bet", "Raise"].map((action) => (
            <button
              key={action}
              className="px-3 py-2 rounded bg-black/60 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleActionClick(action)}
              disabled={actionDisabled}
            >
              {action}
            </button>
          ))}
        </div>
        <div className="flex items-center mt-1">
          <input
            type="range"
            min={bigBlind}
            max={maxBet}
            value={bet}
            onChange={(e) => setBet(Math.min(Number(e.target.value), maxBet))}
            className="w-40"
            disabled={actionDisabled}
          />
          <input
            type="number"
            min={bigBlind}
            max={maxBet}
            value={bet}
            onChange={(e) => setBet(Math.min(Number(e.target.value), maxBet))}
            className="w-16 ml-2 text-black rounded"
            disabled={actionDisabled}
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="px-3 py-2 rounded bg-black/60 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setBet(Math.min(bet * 2, maxBet))}
            disabled={actionDisabled}
          >
            2x
          </button>
          <button
            className="px-3 py-2 rounded bg-black/60 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setBet(Math.min(bet * 3, maxBet))}
            disabled={actionDisabled}
          >
            3x
          </button>
          <button
            className="px-3 py-2 rounded bg-black/60 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setBet(maxBet)}
            disabled={actionDisabled}
          >
            All In
          </button>
        </div>
      </div>
    </div>
  );
}
