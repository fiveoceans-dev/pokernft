// Suits use single lowercase letters so cards can be shared between modules
// without relying on platform-specific symbols. The mapping is:
// s = spades, h = hearts, d = diamonds, c = clubs.
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

/** ← this _must_ be exported */
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

/** Basic representation of a connected player */
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
  /** amount currently wagered in this betting round */
  currentBet: number;
}

/** High level room state used by the server */
export interface GameRoom {
  id: string;
  players: PlayerSession[];
  dealerIndex: number;
  currentTurnIndex: number;
  /** seat index that opened the current betting round */
  firstToActIndex: number;
  /** most recent player to bet or raise */
  lastAggressorIndex: number;
  stage: Stage;
  pot: number;
  communityCards: Card[];
  minBet: number;
  /** remaining cards in the deck */
  deck: Card[];
}

export interface UiPlayer {
  name: string;
  /** full wallet address */
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
  /** Player has requested to sit out after the current hand */
  sitOutNextHand?: boolean;
  /** Player has missed the small blind while sitting out */
  missedSmallBlind?: boolean;
  /** Player has missed the big blind while sitting out */
  missedBigBlind?: boolean;
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

export interface Pot {
  amount: number;
  eligibleSeatSet: number[];
  rake?: number;
}

export interface RakeConfig {
  percentage: number;
  cap: number;
  min: number;
}

export enum DeadBlindRule {
  /** Returning players must post any missed blinds immediately */
  POST = "POST",
  /** Returning players must wait until the big blind to resume */
  WAIT = "WAIT",
}

export interface Table {
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
  /** Seed used to generate the shuffled deck for this hand */
  deckSeed?: string;
  board: Card[];
  pots: Pot[];
  currentRound: Round;
  actingIndex: number | null;
  betToCall: number;
  minRaise: number;
  /** Seat index of the last player to make a full bet/raise */
  lastFullRaise: number | null;
  /** Seats that have acted since the last full bet/raise */
  actedSinceLastRaise: Set<number>;
  actionTimer: number;
  interRoundDelayMs: number;
  /** milliseconds to wait after enough players join before auto-starting a hand */
  handStartDelayMs: number;
  dealAnimationDelayMs: number;
  rakeConfig?: RakeConfig;
  /** Behaviour for players who missed blinds while sitting out */
  deadBlindRule?: DeadBlindRule;
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
  pots: Pot[];
  winners: { playerId: string; amount: number; potIndexes: number[] }[];
  rake?: number;
}
