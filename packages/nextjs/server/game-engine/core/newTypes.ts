/**
 * Event-Driven Finite State Machine Types for Poker Engine
 * 
 * This implements the battle-tested pattern for poker game engines:
 * - Immutable state with pure reducer functions
 * - Explicit FSM: Lobby → Deal → Preflop → Flop → Turn → River → Showdown → Payout → HandEnd
 * - Event-sourced architecture for complete auditability
 */

// Core game phases following explicit FSM pattern
export type Phase = 
  | "lobby"      // Waiting for players
  | "deal"       // Dealing hole cards
  | "preflop"    // Pre-flop betting round
  | "flop"       // Post-flop betting round  
  | "turn"       // Turn betting round
  | "river"      // River betting round
  | "showdown"   // Card evaluation
  | "payout"     // Distributing winnings
  | "handEnd";   // Hand cleanup

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "allin";

export type SeatStatus = "active" | "folded" | "allin" | "empty";

/**
 * Seat represents a single position at the poker table
 * Immutable structure with all state needed for betting calculations
 */
export interface Seat {
  id: number;                    // seat index (0-8 for 9-max)
  pid?: string;                  // player ID if occupied
  chips: number;                 // chips behind (not yet in pot)
  committed: number;             // total committed this hand
  streetCommitted: number;       // committed on current street only
  status: SeatStatus;            // current seat state
  holeCards?: [number, number];  // card indices if dealt
  nickname?: string;             // display name
}

/**
 * Pot structure for main pot and side pots
 * Handles complex all-in scenarios with proper eligibility
 */
export interface Pot {
  cap?: number;                  // side-pot cap (undefined for main pot)
  amount: number;                // total chips in this pot
  eligiblePids: string[];        // player IDs eligible to win this pot
}

/**
 * Core Table state - single source of truth
 * All game state managed through immutable updates to this structure
 */
export interface Table {
  id: string;                    // table identifier
  seats: Seat[];                 // exactly 9 seats (0-8)
  button: number;                // dealer button position
  smallBlind: number;            // small blind amount
  bigBlind: number;              // big blind amount
  
  // Game state
  phase: Phase;                  // current game phase
  street?: Street;               // current street if in betting
  
  // Betting state
  actor?: number;                // seat ID whose turn it is
  lastAggressor?: number;        // seat ID of last bet/raise
  currentBet: number;            // highest streetCommitted among active
  
  // Pot management
  pots: Pot[];                   // main pot + side pots
  
  // Board cards
  communityCards: number[];      // card indices (0-4)
  
  // Configuration
  blinds: {
    sb: number;                  // small blind amount
    bb: number;                  // big blind amount
    ante?: number;               // ante amount (optional)
  };
  
  // Metadata
  handNumber: number;            // incrementing hand counter
  timestamp: number;             // hand start time
}

/**
 * Event types for the event-sourced architecture
 * Each event represents an atomic change to game state
 */
export type PokerEvent = 
  | { t: "StartHand"; handNumber: number; timestamp: number }
  | { t: "PostBlinds"; sb: number; bb: number; ante?: number }
  | { t: "DealHole"; cards: Record<string, [number, number]> }
  | { t: "EnterStreet"; street: Street; cards?: number[] }
  | { t: "Action"; seat: number; action: ActionType; amount?: number }
  | { t: "TimeoutAutoFold"; seat: number }
  | { t: "CloseStreet" }
  | { t: "Showdown"; results: ShowdownResult[] }
  | { t: "Payout"; distributions: PayoutDistribution[] }
  | { t: "HandEnd" }
  | { t: "PlayerJoin"; seat: number; pid: string; chips: number; nickname?: string }
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
  normalizedAmount?: number;  // for bet/raise normalization
}

/**
 * Betting round state calculation result
 */
export interface BettingRoundState {
  isComplete: boolean;
  reason?: "fold-to-one" | "action-complete" | "all-allin";
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