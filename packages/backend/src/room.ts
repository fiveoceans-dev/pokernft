import { GameRoom, PlayerSession, Stage } from './types';
import { dealDeck, draw } from './utils';
import { randomInt } from './rng';
import { rankHand, compareHands } from './handEvaluator';

/** Create an empty game room */
export function createRoom(id: string, minBet = 10): GameRoom {
  return {
    id,
    players: [],
    dealerIndex: 0,
    currentTurnIndex: 0,
    stage: 'waiting',
    pot: 0,
    communityCards: [],
    minBet,
    deck: [],
  };
}

/** Add a player to an existing room */
export function addPlayer(
  room: GameRoom,
  player: Omit<
    PlayerSession,
    'isDealer' | 'isTurn' | 'hand' | 'hasFolded' | 'currentBet' | 'tableId'
  >,
): PlayerSession {
  const session: PlayerSession = {
    ...player,
    tableId: room.id,
    isDealer: false,
    isTurn: false,
    hand: [],
    hasFolded: false,
    currentBet: 0,
  };
  room.players.push(session);
  return session;
}

/** Start a new hand and deal cards */
export function startHand(room: GameRoom) {
  if (room.players.length <= 2) {
    room.stage = 'waiting';
    return;
  }
  room.deck = dealDeck();
  room.communityCards = [];
  room.pot = 0;
  if (room.stage === 'waiting') {
    room.dealerIndex = randomInt(room.players.length);
  } else {
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
  }

  room.stage = 'preflop';

  room.players.forEach((p) => {
    p.hand = [draw(room.deck), draw(room.deck)];
    p.hasFolded = false;
    p.currentBet = 0;
    p.isDealer = false;
    p.isTurn = false;
  });
  room.players[room.dealerIndex].isDealer = true;
  room.currentTurnIndex = (room.dealerIndex + 1) % room.players.length;
  room.players[room.currentTurnIndex].isTurn = true;
}

function maxBet(room: GameRoom): number {
  return Math.max(0, ...room.players.map((p) => p.currentBet));
}

/** Handle a player's betting action */
export function handleAction(
  room: GameRoom,
  playerId: string,
  action: { type: 'fold' | 'call' | 'raise' | 'check'; amount?: number },
) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error('player not found');
  const player = room.players[idx];
  player.isTurn = false;

  const currentMax = maxBet(room);

  switch (action.type) {
    case 'fold':
      player.hasFolded = true;
      break;
    case 'call': {
      const toCall = currentMax - player.currentBet;
      const callAmt = Math.min(toCall, player.chips);
      player.chips -= callAmt;
      player.currentBet += callAmt;
      room.pot += callAmt;
      break;
    }
    case 'raise': {
      const raiseAmt = action.amount ?? 0;
      if (raiseAmt <= 0) throw new Error('raise must be > 0');
      player.chips -= raiseAmt;
      player.currentBet += raiseAmt;
      room.pot += raiseAmt;
      room.minBet = player.currentBet;
      break;
    }
    case 'check':
      if (player.currentBet !== currentMax)
        throw new Error('cannot check when behind on bets');
      break;
  }

  nextTurn(room);
}

/** Advance turn to the next active player */
export function nextTurn(room: GameRoom) {
  if (room.players.length === 0) return;
  let next = room.currentTurnIndex;
  do {
    next = (next + 1) % room.players.length;
  } while (room.players[next].hasFolded);
  room.currentTurnIndex = next;
  room.players.forEach((p, i) => (p.isTurn = i === room.currentTurnIndex));
}

/** Progress to the next betting street and deal community cards */
export function progressStage(room: GameRoom) {
  const order: Stage[] = [
    'waiting',
    'preflop',
    'flop',
    'turn',
    'river',
    'showdown',
  ];
  const pos = order.indexOf(room.stage);
  if (pos === -1 || pos === order.length - 1) return;
  const next = order[pos + 1];

  // burn card
  if (room.deck.length) draw(room.deck);
  if (next === 'flop') {
    room.communityCards.push(draw(room.deck), draw(room.deck), draw(room.deck));
  } else if (next === 'turn' || next === 'river') {
    room.communityCards.push(draw(room.deck));
  }

  room.players.forEach((p) => (p.currentBet = 0));
  room.stage = next;
  room.currentTurnIndex = (room.dealerIndex + 1) % room.players.length;
  room.players.forEach((p, i) => (p.isTurn = i === room.currentTurnIndex));
}

/** Determine the winners of the current room */
export function determineWinners(room: GameRoom): PlayerSession[] {
  const live = room.players.filter(
    (p) => !p.hasFolded && p.hand.length === 2,
  );
  if (live.length === 0) return [];
  const evaluated = live.map((p) => ({
    player: p,
    score: rankHand([...p.hand, ...room.communityCards]),
  }));
  const best = Math.min(...evaluated.map((e) => e.score.rankValue));
  return evaluated
    .filter((e) => e.score.rankValue === best)
    .sort((a, b) => compareHands(a.score, b.score))
    .reduce<PlayerSession[]>((acc, cur, idx, arr) => {
      if (idx === 0) return [cur.player];
      if (compareHands(cur.score, arr[0].score) === 0) acc.push(cur.player);
      return acc;
    }, []);
}

/** Check if the current betting round is complete */
export function isRoundComplete(room: GameRoom): boolean {
  const active = room.players.filter((p) => !p.hasFolded);
  if (active.length <= 1) return true;
  const highest = Math.max(...active.map((p) => p.currentBet));
  return active.every((p) => p.currentBet === highest);
}

/** Split the pot equally amongst winners */
export function payout(room: GameRoom, winners: PlayerSession[]) {
  if (winners.length === 0) return;
  const share = Math.floor(room.pot / winners.length);
  winners.forEach((w) => {
    w.chips += share;
  });
  room.pot = 0;
}
