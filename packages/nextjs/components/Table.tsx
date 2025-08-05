// src/components/Table.tsx

import { useGameStore } from "../hooks/useGameStore";

/**
 * Basic table layout used by the play page.
 *
 * The previous version of this file accidentally re-imported itself which
 * resulted in an infinite recursion during the Next.js build process. This
 * lightweight component simply renders the current players and community
 * cards from the `useGameStore` state without any recursive imports.
 */
export default function Table() {
  const { players, community } = useGameStore();

  return (
    <section className="flex flex-col items-center gap-4">
      {/* Community cards (shown as numeric placeholders for now) */}
      <div className="flex gap-2">
        {community.map((card, idx) => (
          <span
            key={idx}
            className="w-12 h-16 rounded bg-green-700 flex items-center justify-center"
          >
            {card === null ? "?" : card}
          </span>
        ))}
      </div>

      {/* Player seats */}
      <ul className="grid grid-cols-3 gap-2 text-sm">
        {players.map((player, idx) => (
          <li
            key={idx}
            className="px-2 py-1 rounded bg-green-800 text-center whitespace-nowrap"
          >
            {player ?? `Empty seat ${idx + 1}`}
          </li>
        ))}
      </ul>
    </section>
  );
}

