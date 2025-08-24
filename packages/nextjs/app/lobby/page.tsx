"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LobbyTable } from "../../backend";

export default function LobbyPage() {
  const [tables, setTables] = useState<LobbyTable[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.WebSocket) return;
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({ cmdId: Date.now().toString(), type: "LIST_TABLES" })
      );
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "TABLE_LIST") {
          setTables(msg.tables);
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl mb-4">Lobby</h1>
      <ul className="space-y-3">
        {tables.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between bg-black/40 rounded p-4"
          >
            <div>
              <div className="font-semibold">{t.name}</div>
            </div>
            <Link
              href={`/play?table=${t.id}`}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              Join
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

