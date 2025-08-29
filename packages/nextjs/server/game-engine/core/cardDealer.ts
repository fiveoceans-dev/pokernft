/**
 * Card Generation Module
 * 
 * Handles the generation of cards for poker hands using existing deck utilities.
 * This module creates card data structures that are then applied to game state
 * via the reducer functions.
 * 
 * Naming convention:
 * - generate*() functions: Create card data from deck
 * - apply*() functions: Update game state (in reducer.ts)
 */

import { Table, Seat, Street } from './newTypes';
import { Card } from './types';
import { freshDeck, draw, cardToIndex } from '../utils/utils';

/**
 * Generate hole cards for all active players
 * Ported from backup/game-logic/dealer.ts dealHole() function
 * 
 * @param table - Current table state
 * @param seed - Optional seed for deterministic shuffling
 * @returns Record mapping player IDs to their hole cards [card1, card2]
 */
export function generateHoleCards(table: Table, seed?: string): Record<string, [number, number]> {
  // Create fresh shuffled deck
  const deck = freshDeck(seed);
  const cards: Record<string, [number, number]> = {};
  
  // Get active players in seat order starting from small blind
  const activePlayers: { pid: string; seatIndex: number }[] = [];
  const seatCount = table.seats.length;
  
  // Find button position and determine dealing order
  const buttonIndex = table.button;
  
  // Collect active players in dealing order (starting from left of button)
  for (let offset = 1; offset <= seatCount; offset++) {
    const seatIndex = (buttonIndex + offset) % seatCount;
    const seat = table.seats[seatIndex];
    
    if (seat.pid && seat.status === "active") {
      activePlayers.push({ pid: seat.pid, seatIndex });
    }
  }
  
  if (activePlayers.length === 0) {
    return cards;
  }
  
  // Deal two cards to each player (one at a time, casino style)
  for (let cardRound = 0; cardRound < 2; cardRound++) {
    for (const player of activePlayers) {
      if (deck.length === 0) {
        console.error("❌ [CardDealer] Deck underflow during hole card dealing");
        break;
      }
      
      const card = draw(deck);
      const cardIndex = cardToIndex(card);
      
      if (!cards[player.pid]) {
        cards[player.pid] = [0, 0];
      }
      
      cards[player.pid][cardRound] = cardIndex;
    }
  }
  
  console.log(`🎴 [CardDealer] Generated hole cards for ${activePlayers.length} players`);
  return cards;
}

/**
 * Generate community cards for the given street
 * Ported from backup/game-logic/dealer.ts dealBoard() function
 * 
 * @param street - The street to deal cards for
 * @param deck - The current deck (will be mutated by drawing cards)
 * @param burn - Whether to burn a card before dealing (default: true)
 * @returns Array of card indices for the community cards
 */
export function generateBoardCards(street: Street, deck: Card[], burn: boolean = true): number[] {
  if (deck.length === 0) {
    console.error("❌ [CardDealer] Cannot deal board cards - deck is empty");
    return [];
  }
  
  const cards: number[] = [];
  
  // Optional burn card (standard in casino play)
  if (burn && deck.length > 0) {
    draw(deck);
  }
  
  // Deal appropriate number of cards for street
  switch (street) {
    case "flop":
      // Flop: 3 cards
      for (let i = 0; i < 3 && deck.length > 0; i++) {
        const card = draw(deck);
        cards.push(cardToIndex(card));
      }
      break;
      
    case "turn":
    case "river":
      // Turn/River: 1 card each
      if (deck.length > 0) {
        const card = draw(deck);
        cards.push(cardToIndex(card));
      }
      break;
      
    default:
      console.warn(`⚠️ [CardDealer] Unknown street for board cards: ${street}`);
      break;
  }
  
  console.log(`🎴 [CardDealer] Generated ${cards.length} cards for ${street}`);
  return cards;
}

// cardToIndex is now imported directly from utils

/**
 * Create a complete deck with seeded shuffling for reproducible games
 * This is a convenience wrapper around the existing freshDeck utility
 * 
 * @param seed - Seed string for deterministic shuffling
 * @returns Shuffled deck ready for dealing
 */
export function createShuffledDeck(seed: string): Card[] {
  return freshDeck(seed);
}

/**
 * Validate that enough cards remain in deck for the operation
 */
export function validateDeckSize(deck: Card[], operation: string, required: number): boolean {
  if (deck.length < required) {
    console.error(`❌ [CardDealer] Not enough cards for ${operation}: need ${required}, have ${deck.length}`);
    return false;
  }
  return true;
}