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
} from "./server/game-engine/core/types";

// Export types from networking.ts
export type {
  LobbyTable,
  ServerEvent,
  ClientCommand
} from "./server/game-engine/network/networking";

// Export enums and constants
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

// Export wildcard modules (matching original client game-engine)
export * from "./server/game-engine/state/stateMachine";
export * from "./server/game-engine/utils/utils";
export * from "./server/game-engine/utils/hashEvaluator";
export * from "./server/game-engine/game-logic/handEvaluator";
export * from "./server/game-engine/utils/rng";
export * from "./server/game-engine/core/gameEngine";
// Legacy modules removed - functionality moved to GameController
// export * from "./server/game-engine/blindManager";
// export * from "./server/game-engine/seatingManager";
export * from "./server/game-engine/network/eventBus";
export * from "./server/game-engine/state/playerStateMachine";
export * from "./server/game-engine/state/tableStateMachine";
export * from "./server/game-engine/game-logic/dealer";
export * from "./server/game-engine/game-logic/potManager";
// export * from "./server/game-engine/timerService"; // Legacy - use TimerManager
export * from "./server/game-engine/game-logic/handReset";
export * from "./server/game-engine/auditLogger";

// Export specific functions from room module
export {
  createRoom,
  addPlayer,
  nextTurn,
  determineWinners,
  isRoomRoundComplete,
  payout,
  startRoomHand,
  progressStage,
} from "./server/game-engine/core/room";

// Legacy betting engine exports removed - functionality moved to GameController
// export {
//   startBettingRound,
//   applyAction,
//   applyActionFromJson,
//   isBettingRoundComplete,
// } from "./server/game-engine/bettingEngine";

// Export specific functions from hand lifecycle
export { startTableHand, endHand } from "./server/game-engine/game-logic/handLifecycle";