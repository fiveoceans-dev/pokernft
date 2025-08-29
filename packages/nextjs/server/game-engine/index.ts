/**
 * Main Game Engine Exports - New Event-Driven Architecture
 * 
 * This is the single entry point for the poker game engine.
 * All old legacy exports have been replaced with the new event-driven system.
 */

// Re-export everything from newIndex.ts which contains the new architecture
export * from "./newIndex";

// Keep legacy types for backward compatibility where needed
export { PlayerState, TableState, Round } from "./core/types";
export type {
  Suit,
  Rank,
  Card,
  Stage,
  PlayerSession,
  GameRoom,
  UiPlayer,
  GameState as EngineGameState,
  CardShape,
  PlayerAction,
  Player,
  Pot,
  RakeConfig,
  Table,
  HandAction,
  HandLog,
} from "./core/types";

// Export networking types
export type { ServerEvent, ClientCommand, LobbyTable } from "./network/networking";

// Export utility functions
export { indexToCard, cardToIndex } from "./utils/utils";
export * from "./utils/hashEvaluator";
export * from "./utils/rng";

// Export hash tables for hand evaluation
export * from "./hashTables";

console.log('🎮 [GameEngine] New event-driven poker engine loaded successfully');