// Re-export types and constants from server game-engine for client use
// This file serves as a bridge between the client and server game-engine
// Updated to use ONLY the new event-driven state machine architecture

// Export pure FSM types from types.ts
export type { 
  Card,
  Table,
  Seat,
  Pot,
  Phase,
  Street,
  ActionType,
  SeatStatus,
  PokerEvent,
  StateTransition,
  SideEffect,
  TimerEvent,
  GameSnapshot,
  ActionValidation,
  Suit,
  Rank
} from "./server/game-engine/core/types";

// Export types from networking.ts
export type {
  LobbyTable,
  ServerEvent,
  ClientCommand
} from "./server/game-engine/network/networking";

// Export constants
export * from "./server/game-engine/core/constants";

// Export utility functions that are safe for client use
export { 
  indexToCard,
  cardToIndex,
  hashIdToCard,
  cardToHashId
} from "./server/game-engine/utils/utils";

// Export address utilities for client use
export { shortAddress, randomAddress } from "./utils/address";

// Export only safe utility modules (no archived modules) - specific exports to avoid conflicts
export * from "./server/game-engine/utils/hashEvaluator";
export * from "./server/game-engine/utils/rng";

// Hash tables commented out due to SUITS conflict with constants
// export * from "./server/game-engine/hashTables";

console.log('🎮 [ClientGameEngine] Pure FSM architecture loaded for UI');