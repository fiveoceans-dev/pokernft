import { GameRoom, PlayerSession, Stage } from "./types";
import { GameController } from "../data-structures/GameController";
import { dealDeck, draw } from "../utils/utils";
import { randomInt } from "../utils/rng";
import { evaluateHand } from "../utils/hashEvaluator";

/** Create an empty game room */
export function createRoom(id: string, minBet = 50): GameRoom {
  const smallBlind = minBet / 2;
  const bigBlind = minBet;
  
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
    smallBlindAmount: smallBlind,
    bigBlindAmount: bigBlind,
    deck: [],
    actionHistory: [],
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
 * two players to be seated with chips. Updates dealer/button positions.
 * Note: This is a legacy utility function - GameController should be used for full game logic.
 */
export function startRoomHand(room: GameRoom, gameController: GameController) {
  // Always require GameController - no legacy fallback
  console.log(`🎮 [${room.id}] Using GameController for startRoomHand`);
  gameController.startNewHand();
}

function maxBet(room: GameRoom): number {
  return Math.max(0, ...room.players.map((p) => p.currentBet));
}

/** Handle a player's betting action */
// Legacy handleAction removed - use GameController.processAction() instead
// All action processing should go through GameController for consistency

/** Advance turn to the next active player */
export function nextTurn(room: GameRoom) {
  if (room.players.length === 0) {
    console.log(`⚠️ [${room.id}] Cannot advance turn: no players`);
    return;
  }
  
  const currentPlayerId = room.players[room.currentTurnIndex]?.id;
  
  // Clear current player's turn flag
  if (room.currentTurnIndex >= 0 && room.currentTurnIndex < room.players.length) {
    room.players[room.currentTurnIndex].isTurn = false;
  }
  
  // Find next active player
  room.currentTurnIndex = nextActiveIndex(room, room.currentTurnIndex);
  
  const newPlayer = room.players[room.currentTurnIndex];
  if (newPlayer && !newPlayer.hasFolded && newPlayer.chips > 0) {
    newPlayer.isTurn = true;
    console.log(`🔄 [${room.id}] Turn advanced from ${currentPlayerId} to ${newPlayer.id} (position ${room.currentTurnIndex})`);
  } else {
    console.log(`✅ [${room.id}] No more players to act - betting round should complete`);
  }
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
export function progressStage(room: GameRoom, gameController?: GameController) {
  // If GameController is available, use it for complete logic
  if (gameController) {
    console.log(`🎮 [${room.id}] Using GameController for progressStage`);
    gameController.progressStage();
    return;
  }
  
  console.log(`⚠️ [${room.id}] Using legacy progressStage - recommend using GameController`);
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

  // Reset bets for new betting round
  room.players.forEach((p) => (p.currentBet = 0));
  room.actionHistory = []; // Reset action history for new betting round
  room.stage = next;
  
  // Initialize turn order for post-flop (dealer acts last)
  room.currentTurnIndex = nextActiveIndex(room, room.dealerIndex);
  room.firstToActIndex = room.currentTurnIndex;
  if (room.currentTurnIndex >= 0 && room.currentTurnIndex < room.players.length) {
    room.players[room.currentTurnIndex].isTurn = true;
  }
  
  const currentPlayer = room.players[room.currentTurnIndex];
  console.log(`🎯 [${room.id}] Stage progressed to ${next}, first to act: ${currentPlayer?.id} at seat ${currentPlayer?.seat}`);
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
 * Basic logic - GameController should handle this in full implementation.
 */
export function isRoomRoundComplete(room: GameRoom, gameController?: GameController): boolean {
  // If GameController is available, use it for complete logic
  if (gameController) {
    return gameController.isBettingRoundComplete();
  }
  
  console.log(`⚠️ [${room.id}] Using legacy isRoomRoundComplete - recommend using GameController`);
  const activePlayers = room.players.filter(p => !p.hasFolded && p.chips > 0);
  
  if (activePlayers.length <= 1) return true;
  
  // Check if all active players have equal bets
  const maxBet = Math.max(0, ...room.players.map(p => p.currentBet));
  const allEqual = activePlayers.every(p => p.currentBet === maxBet || p.chips === 0);
  
  return allEqual;
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
