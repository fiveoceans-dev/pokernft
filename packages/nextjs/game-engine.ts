// Re-export types and constants from server game-engine for client use
// This file serves as a bridge between the client and server game-engine

// Export types from types.ts
export type { 
  UiPlayer,
  Card,
  Table,
  Player,
  Stage
} from "./server/game-engine/types";

// Export types from networking.ts
export type {
  LobbyTable,
  ServerEvent,
  ClientCommand
} from "./server/game-engine/networking";

// Export enums and constants
export { 
  PlayerState,
  TableState,
  Round as BettingRound
} from "./server/game-engine/types";

// Export utility functions that are safe for client use
export { 
  indexToCard,
  cardToIndex 
} from "./server/game-engine/utils";