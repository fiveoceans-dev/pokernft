import { GameEngine } from "../backend";
import type { LobbyTable } from "../backend";

interface RegistryEntry extends LobbyTable {
  engine: GameEngine;
}

const registry = new Map<string, RegistryEntry>();

export function listTables(): LobbyTable[] {
  return Array.from(registry.values()).map(({ id, name }) => ({ id, name }));
}

export function getEngine(id: string): GameEngine | undefined {
  return registry.get(id)?.engine;
}

export function registerTable(id: string, engine: GameEngine, name?: string) {
  registry.set(id, { id, name: name ?? id, engine });
}
