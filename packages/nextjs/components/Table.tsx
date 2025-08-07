// src/components/Table.tsx

import { useEffect, useState, useMemo } from "react";
import { useGameStore } from "../hooks/useGameStore";
import Card from "./Card";
import { indexToCard } from "../game/utils";
import PlayerSeat from "./PlayerSeat";
import type { Player } from "../game/types";

interface SeatPos {
  x: string;
  y: string;
  t: string;
  r: number;
}

const buildLayout = (isMobile: boolean): SeatPos[] => {
  const count = 9;
  // seats a bit closer to the table edge
  const rx = isMobile ? 43 : 48;
  // when in vertical mode move seats down and compress vertically
  const ry = isMobile ? 38 : 38;
  const cy = isMobile ? 54 : 50;
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }).map((_, i) => {
    let angle = step * (i + 0.5) - Math.PI / 2; // leave gap at top for bank
    if (isMobile) {
      const adjustments = [20, 0, -10, 10, 0, -10, 10, 0, -20];
      angle += (adjustments[i] * Math.PI) / 180;
    }
    return {
      x: `${50 + rx * Math.cos(angle)}%`,
      y: `${cy + ry * Math.sin(angle)}%`,
      t: "-50%,-50%",
      r: isMobile ? (angle * 180) / Math.PI : 0,
    };
  });
};

/* ─────────────────────────────────────────────────────── */

export default function Table() {
  const { players, community, joinSeat } = useGameStore();
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

  /* helper – render a seat or an empty placeholder */
  const seatAt = (idx: number) => {
    const address = players[idx];
    const pos = layout[idx];
    if (!pos) return null;
    const posStyle = {
      left: pos.x,
      top: pos.y,
      transform: `translate(${pos.t})`,
    } as React.CSSProperties;

    /* ── empty seat → button ─────────────────────────────── */
    if (!address) {
      return (
        <div key={idx} style={posStyle} className="absolute">
          <button
            onClick={() => joinSeat(idx)}
            className="w-24 h-8 flex items-center justify-center rounded text-xs text-gray-300 border border-dashed border-gray-500 bg-black/20 transition-colors duration-150 hover:bg-red-500 hover:text-white"
          >
            Play
          </button>
        </div>
      );
    }

    /* ── occupied seat ───────────────────────────────────── */
    const player: Player = {
      name: address,
      chips: 0,
      hand: null,
      folded: false,
      currentBet: 0,
    };
    const isDealer = idx === 1;
    const isActive = false; // turn logic TBD
    const reveal = idx === localIdx;

    return (
      <div key={idx} style={posStyle} className="absolute">
        <div style={{ transform: `rotate(${pos.r}deg)` }}>
          <PlayerSeat
            player={player}
            isDealer={isDealer}
            isActive={isActive}
            revealCards={reveal}
            bet={player.currentBet}
          />
        </div>
      </div>
    );
  };

  const bankEl = (
    <div key="bank" className="absolute left-1/2 -translate-x-1/2 top-[5px]">
      <div className="relative flex justify-center">
        <div className="w-24 h-12 flex items-center justify-center rounded bg-yellow-400 border-4 border-yellow-700 text-black">
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
          size={tableScale < 1 ? "sm" : "md"}
        />
      ))}
    </div>
  );

  const baseW = isMobile ? 420 : 820;
  const baseH = isMobile ? 680 : 520;

  return (
    <div className="relative flex justify-center items-center w-full h-full">
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
    </div>
  );
}
