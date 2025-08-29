// Re-export types and constants from server game-engine for client use
// This file serves as a bridge between the client and server game-engine
// Updated to use ONLY the new event-driven state machine architecture

// Export types from types.ts (legacy compatibility)
export type { 
  UiPlayer,
  Card,
  Table,
  Player,
  Stage,
  GameRoom,
  Suit,
  Rank,
  PlayerSession,
  GameState as EngineGameState,
  CardShape,
  PlayerAction,
  Pot,
  RakeConfig,
  HandAction,
  HandLog
} from "./server/game-engine/core/types";

// Export types from networking.ts
export type {
  LobbyTable,
  ServerEvent,
  ClientCommand
} from "./server/game-engine/network/networking";

// Export enums and constants (legacy compatibility)
export { 
  PlayerState,
  TableState,
  Round as BettingRound
} from "./server/game-engine/core/types";

// Export constants
export * from "./server/game-engine/core/constants";

// Export utility functions that are safe for client use
export { 
  indexToCard,
  cardToIndex 
} from "./server/game-engine/utils/utils";

// Export address utilities for client use
export { shortAddress, randomAddress } from "./utils/address";

// Export only safe utility modules (no archived modules)
export * from "./server/game-engine/utils/utils";
export * from "./server/game-engine/utils/hashEvaluator";
export * from "./server/game-engine/utils/rng";

// Export hash tables for hand evaluation (avoid conflicting exports)
export { 
  HAND_RANKS,
  HAND_RANKS_FLUSH 
} from "./server/game-engine/hashTables";

console.log('🎮 [ClientGameEngine] New state machine architecture loaded for UI');