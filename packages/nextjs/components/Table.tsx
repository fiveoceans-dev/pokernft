// src/components/Table.tsx

import { useEffect, useState, useMemo } from "react";
import { useGameStore } from "../hooks/useGameStore";
import Card from "./Card";
import { indexToCard } from "../game/utils";
import PlayerSeat from "./PlayerSeat";
import type { Player, Card as TCard } from "../game/types";

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

export default function Table() {
  const { players, playerHands, community, joinSeat } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);
  const [tableScale, setTableScale] = useState(1);

  useEffect(() => {
    const handle = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      const baseW = mobile ? 420 : 820;
      const baseH = mobile ? 680 : 520;
      const minTableWidth = mobile ? 360 : baseW;
      const bottomSpace = mobile ? 100 : 0;
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
  }, []);

  const layout = useMemo(() => buildLayout(isMobile), [isMobile]);
  const localIdx = useMemo(() => {
    let max = 0;
    for (let i = 1; i < layout.length; i++) {
      if (parseFloat(layout[i].y) > parseFloat(layout[max].y)) max = i;
    }
    return max;
  }, [layout]);

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
    } as React.CSSProperties;

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

    const player: Player = {
      name: nickname,
      chips: 111110,
      hand,
      folded: false,
      currentBet: 0,
    };
    const isDealer = idx === 1;
    const isActive = false; // turn logic TBD
    const reveal = idx === localIdx;

    const badge = (
      <span
        className="absolute -top-5 left-1/2 -translate-x-1/2 h-5 w-20 px-2 rounded-full
                  bg-black/60 text-white text-xs flex items-center justify-center
                  font-mono tabular-nums whitespace-nowrap pointer-events-none"
      >
        {/* show bet if you prefer: `$${player.currentBet}` */}
        {`$${player.chips}`}
      </span>
    );

    return (
      <div key={idx} style={posStyle} className="absolute">
        <div className="relative">
          {badge}
          <div style={{ transform: `rotate(${pos.r}deg)` }}>
            <PlayerSeat
              player={player}
              isDealer={isDealer}
              isActive={isActive}
              revealCards={reveal}
              bet={player.currentBet}
              cardSize={holeCardSize}
              dealerOffset={dealerOffset}
            />
          </div>
        </div>
      </div>
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

  /* community cards – dead-centre via flexbox */
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center gap-2 w-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          card={
            community[i] !== null ? indexToCard(community[i] as number) : null
          }
          hidden={community[i] === null}
          size={communityCardSize}
        />
      ))}
    </div>
  );

  const baseW = isMobile ? 420 : 820;
  const baseH = isMobile ? 680 : 520;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
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
      <div className="mt-12 flex gap-2">
        {[
          "Fold",
          "Check",
          "Call",
          "Bet",
          "Raise",
        ].map((action) => (
          <button
            key={action}
            className="px-3 py-2 rounded bg-black/60 text-white hover:bg-red-500"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
