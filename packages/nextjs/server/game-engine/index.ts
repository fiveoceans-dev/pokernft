/**
 * Main Game Engine Exports - Event-Driven Poker Architecture
 * 
 * Single entry point for the poker game engine featuring:
 * - Event-sourced state management
 * - WebSocket integration adapter
 * - Pure functional game logic
 */

// Core event-driven architecture
export { EventEngine } from './core/eventEngine';
export { reduce } from './core/reducer';
export * from './core/types';

// Game logic modules
export * from './logic/betting';
export * from './logic/potManager';
export { validateAction as validatePokerAction, getAvailableActions, getBettingLimits } from './logic/validation';

// Utility functions
export * from './utils/ringOrder';
export { indexToCard, cardToIndex } from "./utils/utils";
export * from "./utils/hashEvaluator";
export * from "./utils/rng";

// Timer system
export * from './managers/timerEvents';

// WebSocket integration adapter
export { WebSocketAdapter, createGameEngine } from './integration/webSocketAdapter';
import { WebSocketAdapter } from './integration/webSocketAdapter';

// Legacy types for backward compatibility
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
  LegacyPot as Pot,
  RakeConfig,
  LegacyTable as Table,
  HandAction,
  HandLog,
} from "./core/types";

// Export networking types
export type { ServerEvent, ClientCommand, LobbyTable } from "./network/networking";

// Export hash tables for hand evaluation
export * from "./hashTables";

/**
 * Factory function to create the event-driven game engine
 */
export function createEventDrivenEngine(
  tableId: string,
  smallBlind = 5,
  bigBlind = 10,
  actionTimeoutSeconds = 30
) {
  return new WebSocketAdapter(tableId, bigBlind, actionTimeoutSeconds);
}

console.log('🎮 [GameEngine] Event-driven poker engine loaded successfully');