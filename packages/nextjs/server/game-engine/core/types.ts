/**
 * Event-Driven Finite State Machine Types for Poker Engine
 *
 * This implements the battle-tested pattern for poker game engines:
 * - Immutable state with pure reducer functions
 * - Explicit FSM: Waiting → Deal → Preflop → Flop → Turn → River → Showdown → Payout → HandEnd
 * - Event-sourced architecture for complete auditability
 */

// Core game phases following explicit FSM pattern
export type Phase =
  | "waiting" // Waiting for players between hands
  | "deal" // Dealing hole cards
  | "preflop" // Pre-flop betting round
  | "flop" // Post-flop betting round
  | "turn" // Turn betting round
  | "river" // River betting round
  | "showdown" // Card evaluation
  | "payout" // Distributing winnings
  | "handEnd"; // Hand cleanup

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "allin";

export type SeatStatus = "active" | "folded" | "allin" | "empty";

/**
 * Seat represents a single position at the poker table
 * Immutable structure with all state needed for betting calculations
 */
export interface Seat {
  id: number; // seat index (0-8 for 9-max)
  pid?: string; // player ID if occupied
  chips: number; // chips behind (not yet in pot)
  committed: number; // total committed this hand
  streetCommitted: number; // committed on current street only
  status: SeatStatus; // current seat state
  holeCards?: [number, number]; // card indices if dealt
  nickname?: string; // display name
}

/**
 * Pot structure for main pot and side pots
 * Handles complex all-in scenarios with proper eligibility
 */
export interface Pot {
  cap?: number; // side-pot cap (undefined for main pot)
  amount: number; // total chips in this pot
  eligiblePids: string[]; // player IDs eligible to win this pot
}

/**
 * Core Table state - single source of truth
 * All game state managed through immutable updates to this structure
 */
export interface Table {
  id: string; // table identifier
  seats: Seat[]; // exactly 9 seats (0-8)
  button: number; // dealer button position
  smallBlind: number; // small blind amount
  bigBlind: number; // big blind amount

  // Game state
  phase: Phase; // current game phase
  street?: Street; // current street if in betting

  // Betting state
  actor?: number; // seat ID whose turn it is
  lastAggressor?: number; // seat ID of last bet/raise
  currentBet: number; // highest streetCommitted among active
  lastRaiseSize: number; // size of last bet/raise for min-raise rules

  // Pot management
  pots: Pot[]; // main pot + side pots

  // Board cards
  communityCards: number[]; // card indices (0-4)

  // Configuration
  blinds: {
    sb: number; // small blind amount
    bb: number; // big blind amount
    ante?: number; // ante amount (optional)
  };

  // Metadata
  handNumber: number; // incrementing hand counter
  timestamp: number; // hand start time

  // Big blind option tracking
  bbSeat?: number; // big blind position
  bbHasActed?: boolean; // track if BB has used option
}

/**
 * Event types for the event-sourced architecture
 * Each event represents an atomic change to game state
 */
export type PokerEvent =
  | { t: "StartHand"; handNumber: number; timestamp: number }
  | { t: "PostBlinds"; sb: number; bb: number; ante?: number }
  | { t: "DealHole"; cards: Record<string, [number, number]> }
  | {
      t: "EnterStreet";
      street: Street;
      cards?: number[];
      isAutoDealt?: boolean;
    }
  | { t: "Action"; seat: number; action: ActionType; amount?: number }
  | { t: "TimeoutAutoFold"; seat: number }
  | { t: "CloseStreet" }
  | { t: "Showdown"; results: ShowdownResult[] }
  | { t: "Payout"; distributions: PayoutDistribution[] }
  | { t: "HandEnd" }
  | {
      t: "PlayerJoin";
      seat: number;
      pid: string;
      chips: number;
      nickname?: string;
    }
  | { t: "PlayerLeave"; seat: number; pid: string };

/**
 * Supporting types for complex events
 */
export interface ShowdownResult {
  pid: string;
  handRank: number;
  handDescription: string;
  cards: number[];
}

export interface PayoutDistribution {
  pid: string;
  amount: number;
  potIndex: number;
  reason: "win" | "tie" | "uncalled";
}

/**
 * Action validation result
 * Pure functions return this instead of throwing exceptions
 */
export interface ActionValidation {
  valid: boolean;
  error?: string;
  normalizedAmount?: number; // for bet/raise normalization
}

/**
 * Betting round state calculation result
 */
export interface BettingRoundState {
  isComplete: boolean;
  reason?: "fold-to-one" | "action-complete" | "all-players-allin";
  nextActor?: number;
}

/**
 * Ring traversal helper result
 */
export interface NextActorResult {
  actor?: number;
  isComplete: boolean;
  activeCount: number;
}

/**
 * Pot distribution calculation
 */
export interface PotCalculation {
  pots: Pot[];
  totalCollected: number;
}

/**
 * Hand evaluation result
 */
export interface HandEvaluation {
  rank: number;
  description: string;
  cards: number[];
}

/**
 * Complete game state snapshot for debugging/replay
 */
export interface GameSnapshot {
  table: Table;
  eventLog: PokerEvent[];
  timestamp: number;
  handNumber: number;
}

/**
 * Timer event data
 */
export interface TimerEvent {
  pid: string;
  seat: number;
  deadline: number;
  actionTimeoutMs: number;
}

// Re-export common types that external modules might need
export type { Seat as PokerSeat, Table as PokerTable, Pot as PokerPot };

// ============================================================================
// LEGACY TYPES FOR BACKWARD COMPATIBILITY
// ============================================================================

// Legacy card types
export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Stage =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

// Legacy player and game state types
export interface PlayerSession {
  id: string;
  nickname: string;
  tableId: string;
  seat: number;
  chips: number;
  isDealer: boolean;
  isTurn: boolean;
  hand: Card[];
  hasFolded: boolean;
  currentBet: number;
}

export interface GameRoom {
  id: string;
  players: PlayerSession[];
  dealerIndex: number;
  currentTurnIndex: number;
  firstToActIndex: number;
  lastAggressorIndex: number;
  stage: Stage;
  pot: number;
  communityCards: Card[];
  minBet: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  deck: Card[];
}

export interface UiPlayer {
  name: string;
  address?: string;
  chips: number;
  hand: [Card, Card] | null;
  folded: boolean;
  currentBet?: number;
}

export interface GameState {
  deck: Card[];
  players: UiPlayer[];
  community: Card[];
  pot: number;
  dealerIndex: number;
  currentIndex: number;
  street: "preflop" | "flop" | "turn" | "river" | "showdown";
}

export interface CardShape {
  rank: number;
  suit: number;
}

// Legacy enums
export enum PlayerState {
  EMPTY = "EMPTY",
  SEATED = "SEATED",
  SITTING_OUT = "SITTING_OUT",
  ACTIVE = "ACTIVE",
  FOLDED = "FOLDED",
  ALL_IN = "ALL_IN",
  DISCONNECTED = "DISCONNECTED",
  LEAVING = "LEAVING",
}

export enum PlayerAction {
  NONE = "NONE",
  FOLD = "FOLD",
  CHECK = "CHECK",
  CALL = "CALL",
  BET = "BET",
  RAISE = "RAISE",
  ALL_IN = "ALL_IN",
}

export enum TableState {
  WAITING = "WAITING",
  BLINDS = "BLINDS",
  DEALING_HOLE = "DEALING_HOLE",
  PRE_FLOP = "PRE_FLOP",
  FLOP = "FLOP",
  TURN = "TURN",
  RIVER = "RIVER",
  SHOWDOWN = "SHOWDOWN",
  PAYOUT = "PAYOUT",
  ROTATE = "ROTATE",
  CLEANUP = "CLEANUP",
}

export enum Round {
  PREFLOP = "PREFLOP",
  FLOP = "FLOP",
  TURN = "TURN",
  RIVER = "RIVER",
}

// Legacy interfaces
export interface Player {
  id: string;
  seatIndex: number;
  stack: number;
  state: PlayerState;
  hasButton: boolean;
  autoPostBlinds: boolean;
  timebankMs: number;
  betThisRound: number;
  totalCommitted: number;
  holeCards: Card[];
  lastAction: PlayerAction;
  sitOutNextHand?: boolean;
  missedSmallBlind?: boolean;
  missedBigBlind?: boolean;
}

export interface RakeConfig {
  percentage: number;
  cap: number;
  min: number;
}

export enum DeadBlindRule {
  POST = "POST",
  WAIT = "WAIT",
}

// Legacy Table interface (conflicts with new Table, so we'll alias it)
export interface LegacyTable {
  seats: Array<Player | null>;
  buttonIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  minBuyIn: number;
  maxBuyIn: number;
  state: TableState;
  deck: Card[];
  deckSeed?: string;
  board: Card[];
  pots: LegacyPot[];
  currentRound: Round;
  actingIndex: number | null;
  betToCall: number;
  minRaise: number;
  lastFullRaise: number | null;
  actedSinceLastRaise: Set<number>;
  actionTimer: number;
  interRoundDelayMs: number;
  handStartDelayMs: number;
  dealAnimationDelayMs: number;
  rakeConfig?: RakeConfig;
  deadBlindRule?: DeadBlindRule;
}

// Legacy pot interface (conflicts with new Pot)
export interface LegacyPot {
  amount: number;
  eligibleSeatSet: number[];
  rake?: number;
}

export interface HandAction {
  playerId: string;
  round: Round;
  action: PlayerAction;
  amount: number;
  elapsedMs: number;
}

export interface HandLog {
  handId: string;
  tableId: string;
  startTs: number;
  endTs: number;
  initialStacks: number[];
  seatMap: Array<string | null>;
  actions: HandAction[];
  deckSeed: string;
  pots: LegacyPot[];
  winners: {
    playerId: string;
    amount: number;
    potIndexes: number[];
  }[];
  rake?: number;
}

/**
 * Side Effects - Actions that the reducer wants the engine to perform
 * These are returned by the reducer instead of being executed directly
 */
export type SideEffect =
  | {
      type: "START_TIMER";
      payload: { playerId: string; seatId: number; timeoutMs: number };
    }
  | { type: "STOP_TIMER"; payload: { playerId?: string } }
  | { type: "DISPATCH_EVENT"; payload: { event: PokerEvent; delayMs?: number } }
  | { type: "EMIT_STATE_CHANGE"; payload: { reason: string } }
  | { type: "CLEAR_TIMERS"; payload: {} };

/**
 * State Transition Result
 * Pure reducer returns new state and side effects to execute
 */
export interface StateTransition {
  nextState: Table;
  sideEffects: SideEffect[];
  events?: PokerEvent[]; // Additional events to dispatch
}

/**
 * Transition Configuration for FSM
 */
export interface TransitionConfig {
  fromPhase: Phase;
  trigger: "AUTOMATIC" | "EVENT" | "CONDITION";
  condition?: (table: Table) => boolean;
  toPhase: Phase;
  sideEffects?: SideEffect[];
}
