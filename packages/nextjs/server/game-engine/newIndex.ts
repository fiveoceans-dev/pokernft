/**
 * New Event-Driven Poker Engine Exports
 * 
 * This is the new entry point for the redesigned poker engine.
 * Once migration is complete, this will replace the current index.ts
 */

// Core event-driven architecture
export { EventEngine } from './core/eventEngine';
export { reduce } from './core/reducer';
export * from './core/newTypes';

// Game logic modules
export * from './logic/betting';
export * from './logic/potManager';
export { validateAction as validatePokerAction, getAvailableActions, getBettingLimits } from './logic/validation';

// Utility functions
export * from './utils/ringOrder';

// Timer system
export * from './managers/timerEvents';

// Integration layer for migration
export { LegacyGameEngineAdapter, createGameEngine } from './integration/legacyAdapter';
import { LegacyGameEngineAdapter } from './integration/legacyAdapter';

// Legacy compatibility (re-export old types for gradual migration)
export type {
  GameRoom,
  PlayerSession,
  Stage as LegacyStage,
  Round as LegacyRound
} from './core/types';

/**
 * Factory function to create the new event-driven game engine
 * with legacy compatibility
 */
export function createEventDrivenEngine(
  tableId: string,
  smallBlind = 5,
  bigBlind = 10,
  actionTimeoutSeconds = 30
) {
  return new LegacyGameEngineAdapter(tableId, bigBlind, actionTimeoutSeconds);
}

console.log('🚀 [NewPokerEngine] Event-driven poker engine loaded successfully');