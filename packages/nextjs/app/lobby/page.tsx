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
        JSON.stringify({ cmdId: Date.now().toString(), type: "LIST_TABLES" }),
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
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Poker Lobby</h1>
          <p className="text-gray-400">Choose your table and start playing</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-yellow-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {table.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{table.gameType}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono text-yellow-400">
                    ${table.smallBlind}/${table.bigBlind}
                  </div>
                  <div className="text-gray-400 text-sm">Blinds</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    table.playerCount >= 2 ? 'bg-green-500' : 
                    table.playerCount >= 1 ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-white">
                    {table.playerCount}/{table.maxPlayers} players
                  </span>
                </div>
                
                <div className="text-sm text-gray-400">
                  {table.playerCount >= 2 ? 'Game in progress' : 
                   table.playerCount === 1 ? 'Waiting for players' : 'Empty table'}
                </div>
              </div>
              
              <Link
                href={`/play?table=${table.id}`}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  table.playerCount >= table.maxPlayers
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg'
                }`}
              >
                {table.playerCount >= table.maxPlayers ? 'Table Full' : 'Join Table'}
              </Link>
            </div>
          ))}
        </div>
        
        {tables.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No tables available</div>
            <div className="text-gray-500 text-sm mt-2">
              Server may be starting up...
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
