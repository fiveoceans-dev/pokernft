import { GameRoom, PlayerSession, Stage } from "./types";
import { dealDeck, draw } from "./utils";
import { randomInt } from "./rng";
import { evaluateHand } from "./hashEvaluator";
import { BlindManager } from "./blindManager";

/** Create an empty game room */
export function createRoom(id: string, minBet = 10): GameRoom {
  return {
    id,
    players: [],
    dealerIndex: 0,
    currentTurnIndex: 0,
    firstToActIndex: 0,
    lastAggressorIndex: 0,
    stage: "waiting",
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
    "isDealer" | "isTurn" | "hand" | "hasFolded" | "currentBet" | "tableId"
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

/**
 * Start a new hand at the room level and deal cards. Requires at least
 * two players to be seated with chips. Updates dealer/button positions
 * and posts blinds via {@link BlindManager}.
 */
export function startRoomHand(room: GameRoom) {
  if (room.players.length < 2) {
    room.stage = "waiting";
    return;
  }
  room.deck = dealDeck();
  room.communityCards = [];
  room.pot = 0;
  room.players = room.players.filter((p) => p.chips > 0);
  if (room.stage === "waiting") {
    room.dealerIndex = randomInt(room.players.length);
  } else {
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
  }

  room.stage = "preflop";

  room.players.forEach((p) => {
    p.hand = [draw(room.deck), draw(room.deck)];
    p.hasFolded = false;
    p.currentBet = 0;
    p.isDealer = false;
    p.isTurn = false;
  });
  room.players[room.dealerIndex].isDealer = true;

  // post blinds and set first player to act
  const blindMgr = new BlindManager(room.minBet / 2, room.minBet);
  const { bb } = blindMgr.postBlinds(room);
  const firstToAct = blindMgr.nextActiveIndex(room, bb + 1);
  room.currentTurnIndex = firstToAct;
  room.firstToActIndex = firstToAct;
  room.lastAggressorIndex = firstToAct;
  room.players.forEach((p, i) => (p.isTurn = i === room.currentTurnIndex));
}

function maxBet(room: GameRoom): number {
  return Math.max(0, ...room.players.map((p) => p.currentBet));
}

/** Handle a player's betting action */
export function handleAction(
  room: GameRoom,
  playerId: string,
  action: { type: "fold" | "call" | "raise" | "check"; amount?: number },
) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error("player not found");
  const player = room.players[idx];
  if (idx !== room.currentTurnIndex) throw new Error("not players turn");
  player.isTurn = false;

  const currentMax = maxBet(room);

  switch (action.type) {
    case "fold":
      player.hasFolded = true;
      player.hand = [];
      break;
    case "call": {
      const toCall = currentMax - player.currentBet;
      const callAmt = Math.min(toCall, player.chips);
      player.chips -= callAmt;
      player.currentBet += callAmt;
      room.pot += callAmt;
      break;
    }
    case "raise": {
      const raiseAmt = action.amount ?? 0;
      if (raiseAmt <= 0) throw new Error("raise must be > 0");
      player.chips -= raiseAmt;
      player.currentBet += raiseAmt;
      room.pot += raiseAmt;
      room.minBet = player.currentBet;
      room.lastAggressorIndex = idx;
      break;
    }
    case "check":
      if (player.currentBet !== currentMax)
        throw new Error("cannot check when behind on bets");
      break;
  }
  const active = room.players.filter((p) => !p.hasFolded);
  if (active.length === 1) {
    payout(room, [active[0]]);
    room.stage = "waiting";
    return;
  }

  nextTurn(room);
}

/** Advance turn to the next active player */
export function nextTurn(room: GameRoom) {
  if (room.players.length === 0) return;
  let next = room.currentTurnIndex;
  let count = 0;
  do {
    next = (next + 1) % room.players.length;
    count++;
    if (count > room.players.length) {
      // no eligible player to take action (all folded or all-in)
      room.players.forEach((p) => (p.isTurn = false));
      return;
    }
  } while (room.players[next].hasFolded || room.players[next].chips === 0);
  room.currentTurnIndex = next;
  room.players.forEach((p, i) => (p.isTurn = i === room.currentTurnIndex));
}

/** Find the next active player index starting from `start` */
function nextActiveIndex(room: GameRoom, start: number): number {
  if (room.players.length === 0) return 0;
  let idx = start % room.players.length;
  let count = 0;
  do {
    idx = (idx + 1) % room.players.length;
    count++;
    if (count > room.players.length) return start % room.players.length;
  } while (room.players[idx].hasFolded || room.players[idx].chips === 0);
  return idx;
}

/** Progress to the next betting street and deal community cards */
export function progressStage(room: GameRoom) {
  const order: Stage[] = [
    "waiting",
    "preflop",
    "flop",
    "turn",
    "river",
    "showdown",
  ];
  const pos = order.indexOf(room.stage);
  if (pos === -1 || pos === order.length - 1) return;
  const next = order[pos + 1];

  // burn card
  if (room.deck.length) draw(room.deck);
  if (next === "flop") {
    room.communityCards.push(draw(room.deck), draw(room.deck), draw(room.deck));
  } else if (next === "turn" || next === "river") {
    room.communityCards.push(draw(room.deck));
  }

  room.players.forEach((p) => (p.currentBet = 0));
  room.stage = next;
  const first = nextActiveIndex(room, room.dealerIndex);
  room.currentTurnIndex = first;
  room.firstToActIndex = first;
  room.lastAggressorIndex = first;
  room.players.forEach((p, i) => (p.isTurn = i === room.currentTurnIndex));
}

/** Determine the winners of the current room */
export function determineWinners(room: GameRoom): PlayerSession[] {
  const live = room.players.filter((p) => !p.hasFolded && p.hand.length === 2);
  if (live.length === 0) return [];
  const evaluated = live.map((p) => ({
    player: p,
    score: evaluateHand([...p.hand, ...room.communityCards]),
  }));
  const best = Math.min(...evaluated.map((e) => e.score));
  return evaluated.filter((e) => e.score === best).map((e) => e.player);
}

/**
 * Determine if the current betting round within a room is complete.
 * A round is complete when all active players have matched the highest bet
 * or are all-in, and the turn has returned to the appropriate player.
 */
export function isRoomRoundComplete(room: GameRoom): boolean {
  const active = room.players.filter((p) => !p.hasFolded);
  if (active.length <= 1) return true;
  if (active.every((p) => p.chips === 0)) return true;
  const maxBet = Math.max(...active.map((p) => p.currentBet));
  const allMatched = active.every(
    (p) => p.chips === 0 || p.currentBet === maxBet,
  );
  if (!allMatched) return false;
  if (room.lastAggressorIndex === room.firstToActIndex) {
    return room.currentTurnIndex === room.firstToActIndex;
  }
  return room.currentTurnIndex === room.lastAggressorIndex;
}

/** Split the pot equally amongst winners */
export function payout(room: GameRoom, winners: PlayerSession[]) {
  if (winners.length === 0) return;
  const share = Math.floor(room.pot / winners.length);
  const remainder = room.pot - share * winners.length;
  winners.forEach((w) => {
    w.chips += share;
  });
  if (remainder > 0) {
    const ordered: PlayerSession[] = [];
    for (let i = 1; i <= room.players.length; i++) {
      const idx = (room.dealerIndex + i) % room.players.length;
      const player = room.players[idx];
      if (winners.includes(player)) ordered.push(player);
    }
    for (let i = 0; i < remainder; i++) {
      ordered[i % ordered.length].chips += 1;
    }
  }
  room.pot = 0;
  room.players = room.players.filter((p) => p.chips > 0);
}
