/**
 * Professional Hand Evaluation for No-Limit Texas Hold'em
 * 
 * Implements standard poker hand rankings and comparison logic:
 * - Evaluates best 5-card hand from 7 cards (2 hole + 5 community)
 * - Proper tie-breaking with kickers
 * - Deterministic comparison for tournament play
 */

export interface HandRank {
  rank: number;      // 1-9 (high card to straight flush)
  value: number;     // Detailed value for tie-breaking (higher wins)
  kickers: number[]; // Kicker cards for tie-breaking (sorted high to low)
  cards: number[];   // Best 5 cards used (card indices)
  description: string; // Human-readable description
}

export interface PlayerHand {
  pid: string;
  handRank: HandRank;
  holeCards: [number, number];
}

// Hand ranking constants (higher number = better hand)
export const HAND_RANKS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_KIND: 8,
  STRAIGHT_FLUSH: 9
} as const;

// Card utilities
interface Card {
  rank: number;  // 2-14 (2-10, J=11, Q=12, K=13, A=14)
  suit: number;  // 0-3 (spades, hearts, diamonds, clubs)
}

/**
 * Convert card index (0-51) to rank and suit
 */
function indexToCard(index: number): Card {
  return {
    rank: Math.floor(index / 4) + 2,  // 2-14
    suit: index % 4                   // 0-3
  };
}

/**
 * Get rank value from card index
 */
function getRank(index: number): number {
  return Math.floor(index / 4) + 2;
}

/**
 * Get suit value from card index
 */
function getSuit(index: number): number {
  return index % 4;
}

/**
 * Evaluate the best 5-card poker hand from 7 cards
 */
export function evaluateHand(holeCards: [number, number], board: number[]): HandRank {
  const allCards = [...holeCards, ...board];
  const cards = allCards.map(indexToCard);
  
  // Sort cards by rank (high to low)
  cards.sort((a, b) => b.rank - a.rank);
  
  // Check for each hand type (best first)
  const straightFlush = checkStraightFlush(cards, allCards);
  if (straightFlush) return straightFlush;
  
  const fourOfKind = checkFourOfKind(cards, allCards);
  if (fourOfKind) return fourOfKind;
  
  const fullHouse = checkFullHouse(cards, allCards);
  if (fullHouse) return fullHouse;
  
  const flush = checkFlush(cards, allCards);
  if (flush) return flush;
  
  const straight = checkStraight(cards, allCards);
  if (straight) return straight;
  
  const threeOfKind = checkThreeOfKind(cards, allCards);
  if (threeOfKind) return threeOfKind;
  
  const twoPair = checkTwoPair(cards, allCards);
  if (twoPair) return twoPair;
  
  const pair = checkPair(cards, allCards);
  if (pair) return pair;
  
  // High card
  return checkHighCard(cards, allCards);
}

/**
 * Check for straight flush
 */
function checkStraightFlush(cards: Card[], indices: number[]): HandRank | null {
  // Group by suit
  const suits = new Map<number, Card[]>();
  cards.forEach((card, i) => {
    if (!suits.has(card.suit)) suits.set(card.suit, []);
    suits.get(card.suit)!.push({ ...card, index: indices[i] });
  });
  
  // Check each suit for straight
  for (const [suit, suitCards] of suits) {
    if (suitCards.length >= 5) {
      const straight = findStraight(suitCards);
      if (straight) {
        const isRoyal = straight[0].rank === 14; // Ace high
        return {
          rank: HAND_RANKS.STRAIGHT_FLUSH,
          value: straight[0].rank, // High card of straight
          kickers: [],
          cards: straight.map((c: any) => c.index),
          description: isRoyal ? "Royal Flush" : `Straight Flush, ${rankToString(straight[0].rank)} High`
        };
      }
    }
  }
  
  return null;
}

/**
 * Check for four of a kind
 */
function checkFourOfKind(cards: Card[], indices: number[]): HandRank | null {
  const ranks = getRankCounts(cards);
  
  for (const [rank, count] of ranks) {
    if (count >= 4) {
      const quadCards = cards.filter(c => c.rank === rank).slice(0, 4);
      const kicker = cards.find(c => c.rank !== rank);
      
      return {
        rank: HAND_RANKS.FOUR_OF_KIND,
        value: rank * 1000 + (kicker?.rank || 0), // Quad rank + kicker
        kickers: kicker ? [kicker.rank] : [],
        cards: getCardIndices([...quadCards, ...(kicker ? [kicker] : [])], indices),
        description: `Four of a Kind, ${rankToString(rank)}s`
      };
    }
  }
  
  return null;
}

/**
 * Check for full house
 */
function checkFullHouse(cards: Card[], indices: number[]): HandRank | null {
  const ranks = getRankCounts(cards);
  let trips: number | null = null;
  let pair: number | null = null;
  
  // Find trips first (highest)
  for (const [rank, count] of Array.from(ranks).sort((a, b) => b[0] - a[0])) {
    if (count >= 3 && trips === null) {
      trips = rank;
    } else if (count >= 2 && pair === null && rank !== trips) {
      pair = rank;
    }
  }
  
  if (trips !== null && pair !== null) {
    const tripCards = cards.filter(c => c.rank === trips).slice(0, 3);
    const pairCards = cards.filter(c => c.rank === pair).slice(0, 2);
    
    return {
      rank: HAND_RANKS.FULL_HOUSE,
      value: trips * 100 + pair, // Trips rank + pair rank
      kickers: [],
      cards: getCardIndices([...tripCards, ...pairCards], indices),
      description: `Full House, ${rankToString(trips)}s full of ${rankToString(pair)}s`
    };
  }
  
  return null;
}

/**
 * Check for flush
 */
function checkFlush(cards: Card[], indices: number[]): HandRank | null {
  const suits = new Map<number, Card[]>();
  cards.forEach((card, i) => {
    if (!suits.has(card.suit)) suits.set(card.suit, []);
    suits.get(card.suit)!.push({ ...card, index: indices[i] });
  });
  
  for (const [suit, suitCards] of suits) {
    if (suitCards.length >= 5) {
      // Sort by rank (high to low) and take best 5
      suitCards.sort((a, b) => b.rank - a.rank);
      const bestFive = suitCards.slice(0, 5);
      
      return {
        rank: HAND_RANKS.FLUSH,
        value: bestFive.reduce((sum, card, i) => sum + card.rank * Math.pow(100, 4-i), 0),
        kickers: bestFive.map(c => c.rank),
        cards: bestFive.map((c: any) => c.index),
        description: `Flush, ${rankToString(bestFive[0].rank)} High`
      };
    }
  }
  
  return null;
}

/**
 * Check for straight
 */
function checkStraight(cards: Card[], indices: number[]): HandRank | null {
  const straight = findStraight(cards);
  if (straight) {
    return {
      rank: HAND_RANKS.STRAIGHT,
      value: straight[0].rank,
      kickers: [],
      cards: getCardIndices(straight, indices),
      description: `Straight, ${rankToString(straight[0].rank)} High`
    };
  }
  
  return null;
}

/**
 * Check for three of a kind
 */
function checkThreeOfKind(cards: Card[], indices: number[]): HandRank | null {
  const ranks = getRankCounts(cards);
  
  for (const [rank, count] of Array.from(ranks).sort((a, b) => b[0] - a[0])) {
    if (count >= 3) {
      const tripCards = cards.filter(c => c.rank === rank).slice(0, 3);
      const kickers = cards.filter(c => c.rank !== rank)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 2);
      
      return {
        rank: HAND_RANKS.THREE_OF_KIND,
        value: rank * 10000 + (kickers[0]?.rank || 0) * 100 + (kickers[1]?.rank || 0),
        kickers: kickers.map(k => k.rank),
        cards: getCardIndices([...tripCards, ...kickers], indices),
        description: `Three of a Kind, ${rankToString(rank)}s`
      };
    }
  }
  
  return null;
}

/**
 * Check for two pair
 */
function checkTwoPair(cards: Card[], indices: number[]): HandRank | null {
  const ranks = getRankCounts(cards);
  const pairs: number[] = [];
  
  for (const [rank, count] of Array.from(ranks).sort((a, b) => b[0] - a[0])) {
    if (count >= 2) {
      pairs.push(rank);
    }
  }
  
  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = cards.find(c => c.rank !== highPair && c.rank !== lowPair);
    
    const highPairCards = cards.filter(c => c.rank === highPair).slice(0, 2);
    const lowPairCards = cards.filter(c => c.rank === lowPair).slice(0, 2);
    
    return {
      rank: HAND_RANKS.TWO_PAIR,
      value: highPair * 10000 + lowPair * 100 + (kicker?.rank || 0),
      kickers: kicker ? [kicker.rank] : [],
      cards: getCardIndices([...highPairCards, ...lowPairCards, ...(kicker ? [kicker] : [])], indices),
      description: `Two Pair, ${rankToString(highPair)}s and ${rankToString(lowPair)}s`
    };
  }
  
  return null;
}

/**
 * Check for pair
 */
function checkPair(cards: Card[], indices: number[]): HandRank | null {
  const ranks = getRankCounts(cards);
  
  for (const [rank, count] of Array.from(ranks).sort((a, b) => b[0] - a[0])) {
    if (count >= 2) {
      const pairCards = cards.filter(c => c.rank === rank).slice(0, 2);
      const kickers = cards.filter(c => c.rank !== rank)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 3);
      
      return {
        rank: HAND_RANKS.PAIR,
        value: rank * 1000000 + kickers.reduce((sum, k, i) => sum + k.rank * Math.pow(100, 2-i), 0),
        kickers: kickers.map(k => k.rank),
        cards: getCardIndices([...pairCards, ...kickers], indices),
        description: `Pair of ${rankToString(rank)}s`
      };
    }
  }
  
  return null;
}

/**
 * Check for high card
 */
function checkHighCard(cards: Card[], indices: number[]): HandRank {
  const sorted = cards.sort((a, b) => b.rank - a.rank).slice(0, 5);
  
  return {
    rank: HAND_RANKS.HIGH_CARD,
    value: sorted.reduce((sum, card, i) => sum + card.rank * Math.pow(100, 4-i), 0),
    kickers: sorted.map(c => c.rank),
    cards: getCardIndices(sorted, indices),
    description: `${rankToString(sorted[0].rank)} High`
  };
}

/**
 * Helper functions
 */
function getRankCounts(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  cards.forEach(card => {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  });
  return counts;
}

function findStraight(cards: Card[]): Card[] | null {
  const uniqueRanks = Array.from(new Set(cards.map(c => c.rank))).sort((a, b) => b - a);
  
  // Check for regular straight
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const slice = uniqueRanks.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) {
      // Found straight, get one card of each rank
      return slice.map(rank => cards.find(c => c.rank === rank)!);
    }
  }
  
  // Check for A-2-3-4-5 (wheel)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    return [2, 3, 4, 5, 14].map(rank => cards.find(c => c.rank === rank)!);
  }
  
  return null;
}

function getCardIndices(handCards: Card[], allIndices: number[]): number[] {
  return handCards.map(handCard => {
    // Find the index of this card in the original indices
    const cardIndex = allIndices.find(idx => {
      const card = indexToCard(idx);
      return card.rank === handCard.rank && card.suit === handCard.suit;
    });
    return cardIndex || 0;
  });
}

function rankToString(rank: number): string {
  switch (rank) {
    case 2: return "Two";
    case 3: return "Three";
    case 4: return "Four";
    case 5: return "Five";
    case 6: return "Six";
    case 7: return "Seven";
    case 8: return "Eight";
    case 9: return "Nine";
    case 10: return "Ten";
    case 11: return "Jack";
    case 12: return "Queen";
    case 13: return "King";
    case 14: return "Ace";
    default: return `${rank}`;
  }
}

/**
 * Compare two hands and determine winner
 * Returns positive if hand1 wins, negative if hand2 wins, 0 for tie
 */
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  // First compare hand ranks
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  // Same hand rank, compare values
  if (hand1.value !== hand2.value) {
    return hand1.value - hand2.value;
  }
  
  // Same value, compare kickers
  for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
    const k1 = hand1.kickers[i] || 0;
    const k2 = hand2.kickers[i] || 0;
    if (k1 !== k2) {
      return k1 - k2;
    }
  }
  
  // Perfect tie
  return 0;
}

/**
 * Evaluate all players' hands and determine winners
 */
export function determineWinners(players: PlayerHand[]): Array<{
  pid: string;
  rank: number;
  description: string;
  handRank: HandRank;
}> {
  // Sort by hand strength (best first)
  const sorted = players.sort((a, b) => compareHands(b.handRank, a.handRank));
  
  // Find all players tied for best hand
  const bestHand = sorted[0].handRank;
  const winners = sorted.filter(p => compareHands(p.handRank, bestHand) === 0);
  
  return sorted.map((player, index) => ({
    pid: player.pid,
    rank: index + 1, // 1st, 2nd, 3rd etc
    description: player.handRank.description,
    handRank: player.handRank
  }));
}