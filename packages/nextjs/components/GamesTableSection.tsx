"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LobbyTable } from "~~/game-engine";

export default function GamesTableSection() {
  const [tables, setTables] = useState<LobbyTable[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.WebSocket) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ cmdId: Date.now().toString(), type: "LIST_TABLES" }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "TABLE_LIST") {
          setTables(msg.tables);
        }
      } catch (error) {
        console.error("Failed to parse table list", error);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <section id="games" className="py-8 text-gray-900 dark:text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="text-accent">Live Games (Testnet)</span>
        </h2>
        <div className="overflow-auto rounded-lg border border-gray-300 dark:border-gray-700">
          <table className="min-w-full text-xs sm:text-sm table-auto">
            <thead className="bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 uppercase text-[10px] sm:text-xs">
              <tr>
                <th className="px-2 py-1">Table</th>
                <th className="px-2 py-1">Game</th>
                <th className="px-2 py-1 text-center">Players</th>
                <th className="px-2 py-1 text-center">Blinds</th>
                <th className="px-2 py-1 text-center">Join</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
              {tables.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                  <td className="px-2 py-1">{t.name}</td>
                  <td className="px-2 py-1">{t.gameType}</td>
                  <td className="px-2 py-1 text-center">{t.playerCount}/{t.maxPlayers}</td>
                  <td className="px-2 py-1 text-center">${t.smallBlind}/${t.bigBlind}</td>
                  <td className="px-2 py-1 text-center">
                    <Link
                      href={`/play?table=${t.id}`}
                      className="px-2 py-1 bg-accent text-black font-semibold rounded transition-all duration-200 hover:scale-105 hover:shadow-neon text-xs"
                    >
                      Join
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

