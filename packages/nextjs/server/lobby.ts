import { GameEngine } from "../backend";
import type { LobbyTable } from "../backend";

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
  registry.set(id, { id, name: name ?? id, engine });
}
