// Re-export types and constants from server game-engine for client use
// This file serves as a bridge between the client and server game-engine

// Export types from types.ts
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

// Export constants
export * from "./server/game-engine/constants";

// Export utility functions that are safe for client use
export { 
  indexToCard,
  cardToIndex 
} from "./server/game-engine/utils";

// Export address utilities for client use
export { shortAddress, randomAddress } from "./utils/address";

// Export wildcard modules (matching original client game-engine)
export * from "./server/game-engine/stateMachine";
export * from "./server/game-engine/utils";
export * from "./server/game-engine/hashEvaluator";
export * from "./server/game-engine/handEvaluator";
export * from "./server/game-engine/rng";
export * from "./server/game-engine/gameEngine";
export * from "./server/game-engine/blindManager";
export * from "./server/game-engine/seatingManager";
export * from "./server/game-engine/eventBus";
export * from "./server/game-engine/playerStateMachine";
export * from "./server/game-engine/tableStateMachine";
export * from "./server/game-engine/dealer";
export * from "./server/game-engine/potManager";
export * from "./server/game-engine/timerService";
export * from "./server/game-engine/handReset";
export * from "./server/game-engine/auditLogger";

// Export specific functions from room module
export {
  createRoom,
  addPlayer,
  handleAction,
  nextTurn,
  determineWinners,
  isRoomRoundComplete,
  payout,
  startRoomHand,
  progressStage,
} from "./server/game-engine/room";

// Export specific functions from betting engine
export {
  startBettingRound,
  applyAction,
  applyActionFromJson,
  isBettingRoundComplete,
} from "./server/game-engine/bettingEngine";

// Export specific functions from hand lifecycle
export { startTableHand, endHand } from "./server/game-engine/handLifecycle";