import { RANKS } from "./constants";
import type { Card } from "./types";
import type {
  HandEvaluatorRequest,
  HandEvaluatorResponse,
} from "./jsonFormats";

export interface RankedHand {
  rankValue: number; // lower = better
  bestCards: Card[]; // five cards representing best hand
}

function sortRanks(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) => RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank),
  );
}

function isStraight(ranks: number[]): number | null {
  const uniq = Array.from(new Set(ranks)).sort((a, b) => b - a);
  // normal straight
  for (let i = 0; i <= uniq.length - 5; i++) {
    let ok = true;
    for (let k = 1; k < 5; k++) {
      if (uniq[i + k] !== uniq[i] - k) {
        ok = false;
        break;
      }
    }
    if (ok) return uniq[i];
  }
  // wheel straight (A-2-3-4-5)
  if (
    uniq.includes(12) &&
    uniq.includes(3) &&
    uniq.includes(2) &&
    uniq.includes(1) &&
    uniq.includes(0)
  ) {
    return 3; // treat 5 as high card (rank index 3)
  }
  return null;
}

function evaluateFive(cards: Card[]): RankedHand {
  const ranks = cards.map((c) => RANKS.indexOf(c.rank));
  const suits = cards.map((c) => c.suit);
  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;

  const isFlush = suits.every((s) => s === suits[0]);
  const straightHigh = isStraight(ranks);

  const entries = Object.entries(counts).map(([r, c]) => ({
    rank: Number(r),
    count: c,
  }));
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.rank - a.rank;
  });

  const orderedRanks: number[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) orderedRanks.push(e.rank);
  }

  // Fill remaining kickers
  const kickers = ranks
    .slice()
    .sort((a, b) => b - a)
    .filter((r) => !orderedRanks.includes(r));
  const merged = [...orderedRanks, ...kickers].slice(0, 5);
  const toCards = (arr: number[]): Card[] =>
    arr.map((r) => cards.find((c) => RANKS.indexOf(c.rank) === r)!);

  if (isFlush && straightHigh !== null) {
    const bestRanks: number[] = [];
    if (straightHigh === 3) {
      bestRanks.push(3, 2, 1, 0, 12);
    } else {
      for (let i = 0; i < 5; i++) bestRanks.push(straightHigh - i);
    }
    const best = toCards(bestRanks);
    return { rankValue: 1, bestCards: best };
  }
  if (entries[0].count === 4) {
    const best = toCards([
      ...Array(4).fill(entries[0].rank),
      merged.find((r) => r !== entries[0].rank)!,
    ]);
    return { rankValue: 2, bestCards: best };
  }
  if (entries[0].count === 3 && entries[1]?.count === 2) {
    const best = toCards([
      entries[0].rank,
      entries[0].rank,
      entries[0].rank,
      entries[1].rank,
      entries[1].rank,
    ]);
    return { rankValue: 3, bestCards: best };
  }
  if (isFlush) {
    const best = sortRanks(cards).slice(0, 5);
    return { rankValue: 4, bestCards: best };
  }
  if (straightHigh !== null) {
    const ranksList: number[] = [];
    if (straightHigh === 3) {
      ranksList.push(3, 2, 1, 0, 12);
    } else {
      for (let i = 0; i < 5; i++) ranksList.push(straightHigh - i);
    }
    const best = toCards(ranksList);
    return { rankValue: 5, bestCards: best };
  }
  if (entries[0].count === 3) {
    const kick = merged.filter((r) => r !== entries[0].rank).slice(0, 2);
    const best = toCards([
      entries[0].rank,
      entries[0].rank,
      entries[0].rank,
      ...kick,
    ]);
    return { rankValue: 6, bestCards: best };
  }
  if (entries[0].count === 2 && entries[1]?.count === 2) {
    const pairRanks = [entries[0].rank, entries[1].rank].sort((a, b) => b - a);
    const kick = merged.find((r) => r !== pairRanks[0] && r !== pairRanks[1])!;
    const best = toCards([
      pairRanks[0],
      pairRanks[0],
      pairRanks[1],
      pairRanks[1],
      kick,
    ]);
    return { rankValue: 7, bestCards: best };
  }
  if (entries[0].count === 2) {
    const kick = merged.filter((r) => r !== entries[0].rank).slice(0, 3);
    const best = toCards([entries[0].rank, entries[0].rank, ...kick]);
    return { rankValue: 8, bestCards: best };
  }
  const best = sortRanks(cards).slice(0, 5);
  return { rankValue: 9, bestCards: best };
}

export function rankHand(cards: Card[]): RankedHand {
  if (cards.length < 5) {
    throw new Error("Need at least 5 cards");
  }
  const seven = cards.slice();
  if (seven.length === 5) return evaluateFive(seven);

  let best: RankedHand | null = null;
  for (let a = 0; a < seven.length - 4; a++)
    for (let b = a + 1; b < seven.length - 3; b++)
      for (let c = b + 1; c < seven.length - 2; c++)
        for (let d = c + 1; d < seven.length - 1; d++)
          for (let e = d + 1; e < seven.length; e++) {
            const combo = [seven[a], seven[b], seven[c], seven[d], seven[e]];
            const res = evaluateFive(combo);
            if (!best || compareHands(res, best) < 0) best = res;
          }
  return best!;
}

export function compareHands(a: RankedHand, b: RankedHand): number {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  for (let i = 0; i < 5; i++) {
    const diff =
      RANKS.indexOf(b.bestCards[i].rank) - RANKS.indexOf(a.bestCards[i].rank);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function rankHandFromJson(
  input: HandEvaluatorRequest,
): HandEvaluatorResponse {
  return rankHand(input.cards);
}
