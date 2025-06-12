// src/game/types.ts

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

/** ← this _must_ be exported */
export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  name: string;                 // e.g. the player's address or nickname
  chips: number;                // how many chips they have (for display)
  hand: [Card, Card] | null;    // two Card objects once dealt, or null if not yet dealt
  folded: boolean;              // whether the player has folded this hand
}

export interface GameState {
  deck: Card[];                 // remaining cards in the deck (as suit/rank objects)
  players: Player[];            // all seated players
  community: Card[];            // up to 5 community cards (flop/turn/river)
  pot: number;                  // current pot size
  dealerIndex: number;          // index of the dealer seat
  currentIndex: number;         // index of the active player (whose turn it is)
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

export interface CardShape {
  rank: number;  // 0..12
  suit: number;  // 0..3
}