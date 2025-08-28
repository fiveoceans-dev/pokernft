import { GameRoom, PlayerSession, Stage } from "./types";
import { dealDeck, draw } from "./utils";
import { randomInt } from "./rng";
import { evaluateHand } from "./hashEvaluator";
import { BlindManager } from "./blindManager";
import { BettingRuleEngine } from "./BettingRuleEngine";
import { TurnOrderManager } from "./TurnOrderManager";

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
 * two players to be seated with chips. Updates dealer/button positions
 * and posts blinds via {@link BlindManager}.
 */
export function startRoomHand(room: GameRoom) {
  console.log(`🔄 [${room.id}] Starting new hand with ${room.players.length} players`);
  
  if (room.players.length < 2) {
    room.stage = "waiting";
    console.log(`⚠️ [${room.id}] Not enough players for hand, waiting...`);
    return;
  }
  
  // Filter out busted players first
  const playersBeforeFilter = room.players.length;
  room.players = room.players.filter((p) => p.chips > 0);
  
  if (room.players.length !== playersBeforeFilter) {
    console.log(`👋 [${room.id}] Removed ${playersBeforeFilter - room.players.length} busted players`);
  }
  
  if (room.players.length < 2) {
    room.stage = "waiting";
    console.log(`⚠️ [${room.id}] Not enough players after removing busted players, waiting...`);
    return;
  }
  
  // Complete hand state cleanup - reset all hand-specific state
  room.deck = dealDeck();
  room.communityCards = [];
  room.pot = 0;
  room.actionHistory = []; // Reset action history for new hand
  
  // Reset all player betting and turn state to clean slate
  room.players.forEach((p) => {
    p.currentBet = 0;
    p.isDealer = false;
    p.isTurn = false;
    p.hasFolded = false;
    p.hand = [];
  });
  
  console.log(`🔄 [${room.id}] Reset all player betting state and hands`);
  
  // Advance dealer button properly
  if (room.stage === "waiting") {
    // First hand - random dealer
    room.dealerIndex = randomInt(room.players.length);
    console.log(`🎲 [${room.id}] First hand, random dealer at position ${room.dealerIndex}`);
  } else {
    // Advance dealer button to next active player
    const oldDealerIndex = room.dealerIndex;
    room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
    console.log(`🔄 [${room.id}] Dealer button moved from ${oldDealerIndex} to ${room.dealerIndex}`);
  }

  room.stage = "preflop";

  // Reset all player hand states
  room.players.forEach((p) => {
    p.hand = [draw(room.deck), draw(room.deck)];
    p.hasFolded = false;
    p.currentBet = 0;
    p.isDealer = false;
    p.isTurn = false;
  });
  room.players[room.dealerIndex].isDealer = true;
  
  console.log(`🃏 [${room.id}] Dealer is ${room.players[room.dealerIndex].id} at seat ${room.players[room.dealerIndex].seat}`);

  // Post blinds using the table's default amounts
  const blindMgr = new BlindManager(room.smallBlindAmount, room.bigBlindAmount);
  const { sb, bb } = blindMgr.postBlinds(room);
  console.log(`💰 [${room.id}] Blinds posted - SB: $${room.smallBlindAmount} at seat ${room.players[sb].seat}, BB: $${room.bigBlindAmount} at seat ${room.players[bb].seat}`);
  
  // Record blind postings as forced actions (not voluntary)
  room.actionHistory.push({
    playerId: room.players[sb].id,
    playerIndex: sb,
    action: "blind",
    amount: room.smallBlindAmount,
    timestamp: Date.now()
  });
  room.actionHistory.push({
    playerId: room.players[bb].id,
    playerIndex: bb,
    action: "blind",
    amount: room.bigBlindAmount,
    timestamp: Date.now()
  });
  
  // Initialize proper preflop turn order with BB acting last
  TurnOrderManager.initializeTurnOrder(room);
  room.lastAggressorIndex = bb; // Big blind is initial "aggressor" with their forced bet
  
  const currentPlayer = room.players[room.currentTurnIndex];
  console.log(`🎯 [${room.id}] First to act: ${currentPlayer.id} at seat ${currentPlayer.seat} (position ${room.currentTurnIndex})`);
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
  let actionAmount = 0;

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
      actionAmount = callAmt;
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
      actionAmount = raiseAmt;
      break;
    }
    case "check":
      if (player.currentBet !== currentMax)
        throw new Error("cannot check when behind on bets");
      break;
  }
  
  // Record voluntary action in history
  room.actionHistory.push({
    playerId,
    playerIndex: idx,
    action: action.type as any,
    amount: actionAmount > 0 ? actionAmount : undefined,
    timestamp: Date.now()
  });

  // Winner detection is now handled by GameEngine.handleWinnerScenario()
  // This simplifies room logic to just handle basic action processing

  nextTurn(room);
}

/** Advance turn to the next active player using TurnOrderManager */
export function nextTurn(room: GameRoom) {
  if (room.players.length === 0) {
    console.log(`⚠️ [${room.id}] Cannot advance turn: no players`);
    return;
  }
  
  const currentPlayerId = room.players[room.currentTurnIndex]?.id;
  
  // Use TurnOrderManager which handles BB last action in preflop
  TurnOrderManager.advanceToNextPlayer(room);
  
  const newPlayer = room.players[room.currentTurnIndex];
  if (newPlayer) {
    console.log(`🔄 [${room.id}] Turn advanced from ${currentPlayerId} to ${newPlayer.id} (position ${room.currentTurnIndex})`);
  } else if (room.currentTurnIndex === -1) {
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

  // Reset bets for new betting round
  room.players.forEach((p) => (p.currentBet = 0));
  room.actionHistory = []; // Reset action history for new betting round
  room.stage = next;
  
  // Use TurnOrderManager to properly initialize turn order for the new stage
  TurnOrderManager.initializeTurnOrder(room);
  
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
 * Now delegates to the centralized BettingRuleEngine for consistent logic.
 */
export function isRoomRoundComplete(room: GameRoom): boolean {
  return BettingRuleEngine.isBettingRoundComplete(room);
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
