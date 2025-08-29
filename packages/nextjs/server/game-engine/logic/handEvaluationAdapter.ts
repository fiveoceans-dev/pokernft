/**
 * Hand Evaluation Adapter for Hash Tree Evaluator
 * 
 * Adapts the existing high-performance hash tree based evaluator to work
 * with the event-driven poker engine's card index format.
 */

import { evaluateHand as hashEvaluateHand } from "../utils/hashEvaluator";
import { indexToCard } from "../utils/utils";
import type { Card } from "../core/types";

// Hand ranking descriptions (hash evaluator uses lower numbers for better hands)
const HAND_DESCRIPTIONS = [
  "Invalid",
  "Straight Flush",
  "Four of a Kind", 
  "Full House",
  "Flush",
  "Straight",
  "Three of a Kind",
  "Two Pair",
  "One Pair",
  "High Card"
];

export interface HandRank {
  rank: number;      // 1-9 (higher number = better hand, opposite of hash evaluator)
  value: number;     // Numeric value for comparison (higher wins)
  kickers: number[]; // Not used by hash evaluator but kept for compatibility
  cards: number[];   // Card indices used in best hand
  description: string; // Human-readable description
}

export interface PlayerHand {
  pid: string;
  handRank: HandRank;
  holeCards: [number, number];
}

/**
 * Convert numeric card indices to Card objects and evaluate using hash evaluator
 */
export function evaluateHand(holeCards: [number, number], board: number[]): HandRank {
  // Convert indices to Card objects
  const allCardIndices = [...holeCards, ...board];
  const cards: Card[] = allCardIndices.map(indexToCard);
  
  // Use hash evaluator (returns numeric rank where lower = better)
  const hashRank = hashEvaluateHand(cards);
  
  // Convert hash rank to our format (higher = better)  
  // Hash ranks: 1=SF, 2=4K, 3=FH, 4=FL, 5=ST, 6=3K, 7=2P, 8=1P, 9=HC
  // Our ranks:  9=SF, 8=4K, 7=FH, 6=FL, 5=ST, 4=3K, 3=2P, 2=1P, 1=HC
  const ourRank = 10 - Math.min(Math.max(Math.ceil(hashRank / 1000), 1), 9);
  
  // Generate description based on rank
  const rankCategory = Math.min(Math.max(Math.ceil(hashRank / 1000), 1), 9);
  const description = HAND_DESCRIPTIONS[rankCategory] || "Unknown Hand";
  
  return {
    rank: ourRank,
    value: 10000 - hashRank, // Higher value = better hand
    kickers: [], // Hash evaluator doesn't provide kickers
    cards: allCardIndices, // Return all card indices
    description
  };
}

/**
 * Compare two hands - returns positive if hand1 wins, negative if hand2 wins, 0 for tie
 */
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  // Since our ranks are higher=better and values are higher=better
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  return hand1.value - hand2.value;
}

/**
 * Evaluate all players' hands and determine winners with rankings
 */
export function determineWinners(players: PlayerHand[]): Array<{
  pid: string;
  rank: number;
  description: string;
  handRank: HandRank;
}> {
  // Sort by hand strength (best first)
  const sorted = [...players].sort((a, b) => compareHands(b.handRank, a.handRank));
  
  return sorted.map((player, index) => ({
    pid: player.pid,
    rank: index + 1, // 1st, 2nd, 3rd etc
    description: player.handRank.description,
    handRank: player.handRank
  }));
}