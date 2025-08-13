export type Suit = '\u2660' | '\u2665' | '\u2666' | '\u2663';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'T'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

/** ← this _must_ be exported */
export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Stage =
  | 'waiting'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown';

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
  stage: Stage;
  pot: number;
  communityCards: Card[];
  minBet: number;
  /** remaining cards in the deck */
  deck: Card[];
}

export interface Player {
  name: string;
  chips: number;
  hand: [Card, Card] | null;
  folded: boolean;
  currentBet?: number;
}

export interface GameState {
  deck: Card[];
  players: Player[];
  community: Card[];
  pot: number;
  dealerIndex: number;
  currentIndex: number;
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

export interface CardShape {
  rank: number;
  suit: number;
}
