// src/components/Table.tsx

import { useEffect, useState } from "react";
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

/* ─── absolute positions (0 = top, 4 = bottom-center) ─── */
const desktopLayout: SeatPos[] = [
  { x: "72%", y: "1%", t: "-50%,-50%", r: 0 }, // 1 top-right
  { x: "96%", y: "20%", t: "-50%,-50%", r: 0 }, // 2 right-top
  { x: "100%", y: "60%", t: "-50%,-50%", r: 0 }, // 3 right
  { x: "82%", y: "90%", t: "-50%,-50%", r: 0 }, // 4 bottom-right
  { x: "50%", y: "100%", t: "-50%,-100%", r: 0 }, // 5 bottom (local)
  { x: "18%", y: "90%", t: "-50%,-50%", r: 0 }, // 6 bottom-left
];

const mobileLayout: SeatPos[] = [
  { x: "50%", y: "4%", t: "-50%,-50%", r: 180 }, // top
  { x: "88%", y: "20%", t: "-50%,-50%", r: 90 }, // right-top
  { x: "88%", y: "80%", t: "-50%,-50%", r: 90 }, // right-bottom
  { x: "50%", y: "96%", t: "-50%,-50%", r: 0 }, // bottom
  { x: "12%", y: "80%", t: "-50%,-50%", r: -90 }, // left-bottom
  { x: "12%", y: "20%", t: "-50%,-50%", r: -90 }, // left-top
];

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

  const layout = isMobile ? mobileLayout : desktopLayout;

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
            style={{ transform: `rotate(${pos.r}deg)` }}
            className="w-24 h-8 flex items-center justify-center rounded text-xs text-gray-300 border border-dashed border-gray-500 bg-black/20 transition-colors duration-150 hover:bg-red-500 hover:text-white"
          >
            Join Seat
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
    const isDealer = idx === 0;
    const isActive = false; // turn logic TBD
    const reveal = idx === 4; // local player

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
    <div className="relative flex justify-center items-center py-24 bg-main">
      {/* poker-table oval */}
      <div
        className="relative rounded-full border-8 border-[var(--brand-accent)] bg-gradient-to-br from-[#1e1e1e] to-[#0e0e0e] shadow-[0_0_40px_rgba(0,0,0,0.6)] md:w-[680px] md:h-[420px] w-[420px] h-[680px]"
      >
        {communityRow}
        {/* seats */}
        {layout.map((_, i) => seatAt(i))}
      </div>
    </div>
  );
}
