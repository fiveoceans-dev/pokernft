// src/game/engine.ts
import type { GameState, Player } from './types';
import { draw, rankHand, compareHands, freshDeck } from './utils';
import { STREETS, SMALL_BLIND, BIG_BLIND } from './constants';

/* ─────────── State transitions ─────────── */

export function initGame(players: Player[], dealerIndex = 0): GameState {
  const deck = freshDeck();

  // deal 2 hole cards each
  const dealtPlayers = players.map((p) => ({
    ...p,
    hand: [draw(deck), draw(deck)],
    folded: false,
    currentBet: 0,
  }));

  return {
    deck,
    players: dealtPlayers,
    community: [],
    pot: SMALL_BLIND + BIG_BLIND,
    dealerIndex,
    currentIndex: (dealerIndex + 3) % players.length, // UTG in full ring
    street: 'preflop',
  };
}

/**
 * Progresses from the current street to the next
 * (preflop → flop → turn → river → showdown).
 */
export function nextStreet(state: GameState): GameState {
  const deck = state.deck;
  const streetPos = STREETS.indexOf(state.street);
  if (streetPos === -1 || streetPos >= STREETS.length - 1)
    throw new Error('Already at showdown');

  const next = STREETS[streetPos + 1];

  // burn one, then add community cards as needed
  draw(deck);
  if (next === 'flop')      state.community.push(draw(deck), draw(deck), draw(deck));
  else if (next === 'turn') state.community.push(draw(deck));
  else if (next === 'river')state.community.push(draw(deck));

  return { ...state, street: next, deck };
}

/* ─────────── Showdown logic ─────────── */

export interface ShowdownResult {
  winners: Player[];
  rankedHands: { player: Player; score: ReturnType<typeof rankHand> }[];
}

/** Determine winners & split pot (equal split ties) */
export function showdown(state: GameState): ShowdownResult {
  if (state.street !== 'showdown')
    throw new Error('Not in showdown yet');

  const evaluated = state.players
    .filter((p) => !p.folded)
    .map((p) => ({
      player: p,
      score: rankHand([...p.hand, ...state.community]),
    }));

  // find best (lowest) rankValue
  const best = Math.min(...evaluated.map((e) => e.score.rankValue));
  const winners = evaluated
    .filter((e) => e.score.rankValue === best)
    .sort((a, b) => compareHands(a.score, b.score))
    .reduce<ShowdownResult['winners']>((acc, cur, idx, arr) => {
      // after sorting, compareHands will place best kicker first
      if (idx === 0) return [cur.player];
      if (compareHands(cur.score, arr[0].score) === 0)
        acc.push(cur.player); // exact tie
      return acc;
    }, []);

  return { winners, rankedHands: evaluated };
}
