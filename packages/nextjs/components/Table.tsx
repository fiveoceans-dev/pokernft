// src/components/Table.tsx

import { useGameStore } from "../hooks/useGameStore";
import Card from "./Card";
import PlayerSeat from "./PlayerSeat";

/* ─── absolute positions (0 = top, 4 = bottom-center) ─── */
const seatLayout = [
  { x: "72%", y: "1%", t: "-50%,-50%" }, // 1 top-right
  { x: "96%", y: "20%", t: "-50%,-50%" }, // 2 right-top
  { x: "100%", y: "60%", t: "-50%,-50%" }, // 3 right
  { x: "82%", y: "90%", t: "-50%,-50%" }, // 4 bottom-right
  { x: "50%", y: "100%", t: "-50%,-100%" }, // 5 bottom (local)
  { x: "18%", y: "90%", t: "-50%,-50%" }, // 6 bottom-left
  { x: "0%", y: "60%", t: "-50%,-50%" }, // 7 left
  { x: "4%", y: "20%", t: "-50%,-50%" }, // 8 left-top
  { x: "28%", y: "1%", t: "-50%,-50%" }, // 9 top-left
];

/* ─────────────────────────────────────────────────────── */

export default function Table() {
  const { players, community } = useGameStore();

  /* helper – render a seat or an empty placeholder */
  const seatAt = (idx: number) => {
    const player = players[idx];
    const style = {
      left: seatLayout[idx].x,
      top: seatLayout[idx].y,
      transform: `translate(${seatLayout[idx].t})`,
    } as React.CSSProperties;

    /* ── empty seat → button ─────────────────────────────── */
    if (!player) {
      return (
        <button
          key={idx}
          style={style}
          onClick={() => alert("Sit-down logic TBD")}
          className="
          absolute w-24 h-8 flex items-center justify-center rounded
          text-xs text-gray-300 border border-dashed border-gray-500 bg-black/20
          transition-colors duration-150 hover:bg-red-500 hover:text-white
        "
        >
          Join Seat
        </button>
      );
    }

    /* ── occupied seat ───────────────────────────────────── */
    const isDealer = idx === 0;
    const isActive = false; // turn logic TBD
    const reveal = idx === 4; // local player

    return (
      <div key={idx} style={style} className="absolute">
        <PlayerSeat
          player={player}
          isDealer={isDealer}
          isActive={isActive}
          revealCards={reveal}
          bet={player.currentBet}
        />
      </div>
    );
  };

  /* community cards – dead-centre via flexbox */
  const communityRow = (
    <div className="absolute inset-0 flex items-center justify-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card
          key={i}
          card={community[i] ?? null}
          hidden={i >= community.length}
          size="md"
        />
      ))}
    </div>
  );

  return (
    <div className="relative flex justify-center items-center py-24">
      {/* poker-table oval */}
      <div
        className="
          relative rounded-full border-8 border-[var(--brand-accent)] bg-gradient-to-br from-[#1e1e1e] to-[#0e0e0e]
          shadow-[0_0_40px_rgba(0,0,0,0.6)]
          w-[680px] h-[420px]
        "
      >
        {communityRow}
        {/* seats */}
        {seatLayout.map((_, i) => seatAt(i))}
      </div>
    </div>
  );
}

