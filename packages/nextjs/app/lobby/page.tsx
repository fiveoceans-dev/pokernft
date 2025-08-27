"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LobbyTable } from "../../game-engine";

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function LobbyPage() {
  const [tables, setTables] = useState<LobbyTable[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window === "undefined" || !window.WebSocket) {
      console.log('WebSocket not supported');
      return;
    }
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    setWsUrl(wsUrl);
    console.log('🔗 Attempting WebSocket connection to:', wsUrl);
    console.log('🌍 Environment NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL);
    
    setConnectionStatus('connecting');
    setConnectionError('');
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      setConnectionStatus('connected');
      setConnectionError('');
      
      const listTablesCommand = { cmdId: Date.now().toString(), type: "LIST_TABLES" };
      console.log('📤 Sending LIST_TABLES command:', listTablesCommand);
      ws.send(JSON.stringify(listTablesCommand));
    };
    
    ws.onmessage = (e) => {
      console.log('📥 WebSocket message received:', e.data);
      try {
        const msg = JSON.parse(e.data);
        console.log('📋 Parsed message:', msg);
        
        if (msg.type === "TABLE_LIST") {
          console.log('🎲 Tables received:', msg.tables);
          setTables(msg.tables);
        }
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error, e.data);
      }
    };
    
    ws.onclose = (e) => {
      console.log('🔌 WebSocket connection closed:', e.code, e.reason);
      setConnectionStatus('disconnected');
      if (e.code !== 1000) {
        setConnectionError(`Connection closed (Code: ${e.code})`);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      setConnectionError('Failed to connect to server');
    };
    
    return () => {
      console.log('🔌 Closing WebSocket connection');
      ws.close();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Lobby</h1>
          
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
            {connectionStatus === 'connecting' && (
              <div>
                <div className="text-yellow-400 text-lg">Connecting to server...</div>
                <div className="text-gray-500 text-sm mt-2">Establishing WebSocket connection</div>
              </div>
            )}
            
            {connectionStatus === 'connected' && (
              <div>
                <div className="text-gray-400 text-lg">No tables available</div>
                <div className="text-gray-500 text-sm mt-2">
                  Connected to server but no tables found
                </div>
              </div>
            )}
            
            {connectionStatus === 'error' && (
              <div>
                <div className="text-red-400 text-lg">Connection Failed</div>
                <div className="text-gray-500 text-sm mt-2">
                  {connectionError || 'Unable to connect to server'}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Trying to connect to: {wsUrl}
                </div>
              </div>
            )}
            
            {connectionStatus === 'disconnected' && (
              <div>
                <div className="text-gray-400 text-lg">Disconnected</div>
                <div className="text-gray-500 text-sm mt-2">
                  Connection to server lost
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
