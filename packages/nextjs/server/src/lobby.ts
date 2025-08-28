import type { LegacyGameEngineAdapter as GameEngine } from "../game-engine/newIndex";
import type { LobbyTable } from "../game-engine";

interface RegistryEntry extends LobbyTable {
  engine: GameEngine;
}

const registry = new Map<string, RegistryEntry>();

export function listTables(): LobbyTable[] {
  return Array.from(registry.values()).map(({ id, name, engine }) => {
    const room = engine.getState();
    return {
      id,
      name,
      gameType: "No Limit Hold'em",
      playerCount: room.players.length,
      maxPlayers: 9,
      smallBlind: room.minBet / 2,
      bigBlind: room.minBet,
    };
  });
}

export function getEngine(id: string): GameEngine | undefined {
  return registry.get(id)?.engine;
}

export function registerTable(id: string, engine: GameEngine, name?: string) {
  const tableName = name ?? id;
  console.log(`📝 Registering table in lobby: ${tableName} (ID: ${id})`);
  const room = engine.getState();
  registry.set(id, { 
    id, 
    name: tableName, 
    engine,
    gameType: "No Limit Hold'em",
    playerCount: room.players.length,
    maxPlayers: 9,
    smallBlind: room.smallBlindAmount || Math.floor(room.minBet / 2),
    bigBlind: room.bigBlindAmount || room.minBet
  });
  console.log(`🎯 Lobby now has ${registry.size} tables registered`);
}
