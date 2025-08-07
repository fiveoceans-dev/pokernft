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
  const ry = isMobile ? 58 : 38;
  return Array.from({ length: count }).map((_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: `${50 + rx * Math.cos(angle)}%`,
      y: `${50 + ry * Math.sin(angle)}%`,
      t: "-50%,-50%",
      r: isMobile ? (angle * 180) / Math.PI : 0,
    };
  });
};

/* ─────────────────────────────────────────────────────── */

export default function Table() {
  const { players, community, joinSeat } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 640);
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

    /* ── top centre reserved for pot/announcements ──────── */
    if (idx === 0) {
      return (
        <div key="pot" style={posStyle} className="absolute">
          <div className="w-24 h-12 flex items-center justify-center rounded bg-yellow-400 border-4 border-yellow-700 text-black">
            Pot
          </div>
        </div>
      );
    }

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

  /* community cards – dead-centre via flexbox */
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          card={
            community[i] !== null ? indexToCard(community[i] as number) : null
          }
          hidden={community[i] === null}
          size="md"
        />
      ))}
    </div>
  );

  return (
    <div className="relative flex justify-center items-center py-24">
      {/* poker-table oval */}
      <div
        className="relative rounded-full border-8 border-[var(--brand-accent)] bg-main shadow-[0_0_40px_rgba(0,0,0,0.6)] md:w-[820px] md:h-[520px] w-[420px] h-[680px]"
      >
        {communityRow}
        {/* seats */}
        {layout.map((_, i) => seatAt(i))}
      </div>
    </div>
  );
}
