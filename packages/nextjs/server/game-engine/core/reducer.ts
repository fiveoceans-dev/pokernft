/**
 * Pure Reducer for Event-Driven Poker Engine
 *
 * Core principle: reduce(table: Table, event: PokerEvent) -> Table
 * - Pure functions with no side effects
 * - Immutable state updates
 * - Deterministic and testable
 * - Complete event sourcing support
 */

import {
  Table,
  Seat,
  PokerEvent,
  Phase,
  Street,
  ActionType,
  SeatStatus,
  Pot,
  PayoutDistribution,
  StateTransition,
  SideEffect,
} from "./types";
import { getNextActor, countActivePlayers, getBettingRoundState } from "../utils/ringOrder";
import {
  getBlindPositions,
  getFirstActor,
  calculateNextButton,
  validateAndFixButton,
  shouldGiveBBOption,
} from "../logic/gameRules";
import { createDeck, generateDeckSeed } from "../logic/deckManager";
import { generateHoleCards, generateBoardCards } from "./cardDealer";
import { collectIntoPots } from "../logic/potManager";
import { getNextStreet } from "../logic/betting";
import { validateAction as validatePokerAction } from "../logic/validation";
import { ACTION_TIMEOUT_MS } from "./constants";

/**
 * Main reducer function - pure and deterministic
 * Processes events and returns new table state with side effects
 */
export function reduce(table: Table, event: PokerEvent): StateTransition {
  switch (event.t) {
    case "StartHand":
      return startHand(table, event.handNumber, event.timestamp);

    case "PostBlinds":
      return postBlinds(table, event.sb, event.bb, event.ante);

    case "DealHole":
      return applyHoleCards(table, event.cards);

    case "EnterStreet":
      return enterStreet(table, event.street, event.cards, event.isAutoDealt);

    case "Action":
      return applyAction(table, event.seat, event.action, event.amount);

    case "TimeoutAutoFold":
      return handleTimeoutAutoFold(table, event.seat);

    case "CloseStreet":
      return closeStreet(table);

    case "Showdown":
      return processShowdown(table, event.results);

    case "Payout":
      return processPayout(table, event.distributions);

    case "HandEnd":
      return endHand(table);

    case "PlayerJoin":
      return addPlayer(
        table,
        event.seat,
        event.pid,
        event.chips,
        event.nickname,
      );

    case "PlayerLeave":
      return removePlayer(table, event.seat, event.pid);

    default:
      // TypeScript ensures all cases are handled
      return { nextState: table, sideEffects: [] };
  }
}

/**
 * Initialize new hand
 */
function startHand(
  table: Table,
  handNumber: number,
  timestamp: number,
): StateTransition {
  // Randomize first dealer (button) deterministically on first hand using timestamp
  let button = table.button;
  if (table.handNumber === 0) {
    const eligible = table.seats
      .filter((s) => s.pid && s.chips > 0)
      .map((s) => s.id);
    if (eligible.length > 1) {
      const idx = timestamp % eligible.length;
      button = eligible[idx];
      console.log(`🎲 [Reducer] Randomized initial button to seat ${button} from eligible ${eligible.join(',')}`);
    }
  }

  // Generate deck seed and create shuffled deck
  const deckSeed = generateDeckSeed(handNumber, timestamp);
  const deck = createDeck(deckSeed);
  console.log(`🎰 [Reducer] Created shuffled deck with seed: ${deckSeed}`);

  const nextState = {
    ...table,
    phase: "deal" as Phase,
    handNumber,
    timestamp,
    button,
    street: undefined,
    actor: undefined,
    lastAggressor: undefined,
    currentBet: 0,
    lastRaiseSize: table.bigBlind,
    pots: [],
    communityCards: [],
    // Deck management
    deck,
    deckIndex: 0,
    deckSeed,
    // Reset all seats for new hand
    seats: table.seats.map((seat) => ({
      ...seat,
      committed: 0,
      streetCommitted: 0,
      status: (seat.pid ? "active" : "empty") as SeatStatus,
      holeCards: undefined,
    })),
  };

  // Side effects: automatically post blinds and deal hole cards
  const sideEffects: SideEffect[] = [
    {
      type: "DISPATCH_EVENT",
      payload: {
        event: { t: "PostBlinds", sb: table.smallBlind, bb: table.bigBlind },
      },
    },
    { type: "EMIT_STATE_CHANGE", payload: { reason: "dealer_selected" } },
    { type: "EMIT_STATE_CHANGE", payload: { reason: "hand_started" } },
  ];

  return { nextState, sideEffects };
}

/**
 * Post blinds and set initial betting state
 */
function postBlinds(
  table: Table,
  sb: number,
  bb: number,
  ante?: number,
): StateTransition {
  const newSeats = [...table.seats];
  const activePlayers = newSeats.filter((seat) => seat.status === "active");

  if (activePlayers.length < 2) {
    return { nextState: table, sideEffects: [] }; // Need at least 2 players
  }

  // Validate and fix button position using game rules
  const validButton = validateAndFixButton(newSeats, table.button);

  // Get correct blind positions according to poker rules
  const blindPositions = getBlindPositions(newSeats, validButton);

  if (!blindPositions) {
    console.error(`❌ [Reducer] Could not determine blind positions`);
    return { nextState: table, sideEffects: [] };
  }

  const { sb: sbIndex, bb: bbIndex } = blindPositions;
  const activeCount = countActivePlayers(newSeats);
  const isHeadsUp = activeCount === 2;

  console.log(
    `🃏 [Reducer] Posting blinds - ${isHeadsUp ? "Heads-up" : "Multi-way"} (${activeCount} players)`,
  );
  console.log(`   SB: seat ${sbIndex} (${newSeats[sbIndex]?.pid})`);
  console.log(`   BB: seat ${bbIndex} (${newSeats[bbIndex]?.pid})`);

  // Post small blind
  if (sbIndex !== -1) {
    const sbSeat = newSeats[sbIndex];
    const sbAmount = Math.min(sb, sbSeat.chips);
    newSeats[sbIndex] = {
      ...sbSeat,
      chips: sbSeat.chips - sbAmount,
      committed: sbAmount,
      streetCommitted: sbAmount,
      status: sbSeat.chips === sbAmount ? "allin" : "active",
    };
  }

  // Post big blind
  if (bbIndex !== -1) {
    const bbSeat = newSeats[bbIndex];
    const bbAmount = Math.min(bb, bbSeat.chips);
    newSeats[bbIndex] = {
      ...bbSeat,
      chips: bbSeat.chips - bbAmount,
      committed: bbAmount,
      streetCommitted: bbAmount,
      status: bbSeat.chips === bbAmount ? "allin" : "active",
    };
  }

  // Post antes if specified
  if (ante && ante > 0) {
    for (let i = 0; i < newSeats.length; i++) {
      const seat = newSeats[i];
      if (seat.status === "active") {
        const anteAmount = Math.min(ante, seat.chips);
        newSeats[i] = {
          ...seat,
          chips: seat.chips - anteAmount,
          committed: seat.committed + anteAmount,
          streetCommitted: seat.streetCommitted + anteAmount,
        };
      }
    }
  }

  // Calculate first actor using game rules
  const tableWithSeats = { ...table, seats: newSeats, button: validButton };
  const actionOrder = getFirstActor(tableWithSeats, true);

  const nextState = {
    ...table,
    button: validButton, // Use corrected button position
    phase: "deal" as Phase, // Stay in deal phase - preflop will be set by EnterStreet
    seats: newSeats,
    blinds: { sb, bb, ante },
    bbSeat: bbIndex, // Track BB position for option logic
    bbHasActed: false, // BB hasn't acted yet
  };

  console.log(
    `💰 [Reducer] Blinds posted - BB: ${bb} at seat ${bbIndex}, SB: ${sb} at seat ${sbIndex}`,
  );

  // Side effects: deal hole cards, then enter preflop betting round
  const sideEffects: SideEffect[] = [
    {
      type: "DISPATCH_EVENT",
      payload: {
        event: { t: "DealHole", cards: {} }, // Cards will be generated by reducer
      },
    },
    {
      type: "DISPATCH_EVENT", 
      payload: {
        event: { t: "EnterStreet", street: "preflop" }, // Proper FSM transition
      },
    },
    { type: "EMIT_STATE_CHANGE", payload: { reason: "blinds_posted" } },
  ];

  // Emit heads-up detection for UI/logging
  if (isHeadsUp) {
    sideEffects.push({
      type: "EMIT_STATE_CHANGE",
      payload: { reason: "heads_up_detected" },
    });
  }

  return { nextState, sideEffects };
}

/**
 * Apply hole cards to active players (pure state update)
 */
function applyHoleCards(
  table: Table,
  cards: Record<string, [number, number]> | undefined,
): StateTransition {
  // If no cards provided, generate them from the table's deck
  let playerCards = cards;
  let nextDeckIndex = table.deckIndex;
  
  if (!playerCards || Object.keys(playerCards).length === 0) {
    // Generate cards from the table's deck
    const result = generateHoleCards(table);
    playerCards = result.cards;
    nextDeckIndex = result.nextIndex;
    console.log(`🎴 [Reducer] Generated hole cards from deck, next index: ${nextDeckIndex}`);
  }

  const newSeats = table.seats.map((seat) => {
    if (seat.pid && playerCards![seat.pid]) {
      return {
        ...seat,
        holeCards: playerCards![seat.pid],
      };
    }
    return seat;
  });

  const nextState = {
    ...table,
    seats: newSeats,
    deckIndex: nextDeckIndex,
  };

  // Side effect: emit that cards were dealt
  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "cards_dealt" } },
  ];

  return { nextState, sideEffects };
}

/**
 * Enter new betting street
 */
function enterStreet(
  table: Table,
  street: Street,
  cards?: number[],
  isAutoDealt?: boolean,
): StateTransition {
  const newSeats = table.seats.map((seat) => ({
    ...seat,
    streetCommitted: 0, // Reset street commitments
  }));

  // Generate cards from deck if not provided
  let communityCards = table.communityCards;
  let nextDeckIndex = table.deckIndex;
  
  if ((!cards || cards.length === 0) && street !== "preflop") {
    // Generate board cards from the table's deck
    const result = generateBoardCards(table, street, true);
    communityCards = [...table.communityCards, ...result.cards];
    nextDeckIndex = result.nextIndex;
    console.log(`🎴 [Reducer] Generated ${result.cards.length} cards for ${street}, next index: ${nextDeckIndex}`);
  } else if (cards) {
    communityCards = [...table.communityCards, ...cards];
  }

  // Determine first actor and betting state based on street
  let actor: number | undefined = undefined;
  let currentBet = 0;
  let lastRaiseSize = table.bigBlind;
  
  if (!isAutoDealt) {
    const tableWithSeats = { ...table, seats: newSeats };
    
    if (street === "preflop") {
      // Preflop: Use existing blind state and calculate first actor
      const actionOrder = getFirstActor(tableWithSeats, true); // true = preflop
      actor = actionOrder.actor === -1 ? undefined : actionOrder.actor;
      currentBet = table.bigBlind || 0; // Big blind is the current bet
      lastRaiseSize = table.bigBlind || 0; // Minimum raise is BB
      console.log(`🎯 [Reducer] Preflop first actor: seat ${actor} (${actor !== undefined ? newSeats[actor]?.pid : "none"}), BB: ${currentBet}`);
    } else {
      // Postflop: Reset betting and get first actor
      const actionOrder = getFirstActor(tableWithSeats, false); // false = postflop
      actor = actionOrder.actor === -1 ? undefined : actionOrder.actor;
      currentBet = 0;
      lastRaiseSize = table.bigBlind;
      console.log(`🎯 [Reducer] ${street} first actor: seat ${actor} (${actor !== undefined ? newSeats[actor]?.pid : "none"})`);
    }
  }

  const nextState = {
    ...table,
    phase: street,
    street,
    seats: newSeats,
    currentBet,
    lastRaiseSize,
    lastAggressor: undefined,
    actor, // Will be undefined for all-in scenarios
    communityCards,
    deckIndex: nextDeckIndex, // Update deck position after dealing cards
    // Preserve BB option state for preflop
    ...(street === "preflop" && {
      bbSeat: table.bbSeat,
      bbHasActed: table.bbHasActed || false,
    }),
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "street_changed" } },
  ];

  // Start timer for first actor if not auto-dealt (all-in scenario)
  if (
    !isAutoDealt &&
    actor !== undefined &&
    actor >= 0 &&
    actor < newSeats.length
  ) {
    const actorSeat = newSeats[actor];
    if (actorSeat.pid && actorSeat.status === "active") {
      sideEffects.push({
        type: "START_TIMER",
        payload: {
          playerId: actorSeat.pid,
          seatId: actor,
          timeoutMs: ACTION_TIMEOUT_MS,
        },
      });
    }
  }

  // Only auto-progress if everyone is all-in (no betting possible)
  const roundState = getBettingRoundState(nextState);
  if (roundState.isComplete && roundState.reason === 'all-players-allin') {
    console.log(`🎯 [Reducer] All players all-in on ${street}, auto-dealing remaining streets`);
    // Auto-deal remaining streets when no betting is possible
    sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'CloseStreet' } } });
    const currentStreet = nextState.street;
    const nextStreet = currentStreet ? getNextStreet(currentStreet as Street) : null;
    if (nextStreet) {
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'EnterStreet', street: nextStreet, isAutoDealt: true } } });
    } else {
      // No more streets, go to showdown
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'Showdown', results: [] } } });
    }
  } else if (actor === undefined) {
    // ERROR: Can't determine first actor but players can act
    console.error(`❌ [Reducer] Failed to determine first actor for ${street} - this should not happen`);
    console.error(`   Active players: ${nextState.seats.filter(s => s.status === 'active' && s.pid).map(s => `${s.pid}(${s.id})`).join(', ')}`);
    console.error(`   Button: ${nextState.button}, IsAutoDealt: ${isAutoDealt}`);
    // Don't auto-progress - wait for manual fix or debugging
  }

  return { nextState, sideEffects };
}

/**
 * Apply player action with immutable updates
 */
function applyAction(
  table: Table,
  seatId: number,
  action: ActionType,
  amount: number = 0,
): StateTransition {
  const seat = table.seats[seatId];
  if (!seat || seat.status !== "active") {
    return { nextState: table, sideEffects: [] }; // Invalid action
  }

  // VALIDATE: Is it this player's turn?
  if (table.actor !== seatId) {
    console.warn(
      `❌ [Reducer] Seat ${seatId} acted out of turn (current actor: ${table.actor})`,
    );
    return { nextState: table, sideEffects: [] }; // State unchanged - invalid action
  }

  // Enforce action validity (min bet/raise, to-call, phase)
  const validation = validatePokerAction(table, seatId, action, amount);
  if (!validation.valid) {
    console.warn(`❌ [Reducer] Action validation failed: ${validation.error}`);
    return { nextState: table, sideEffects: [] };
  }

  const newSeats = [...table.seats];
  let newCurrentBet = table.currentBet;
  let newLastAggressor = table.lastAggressor;
  let newLastRaiseSize = table.lastRaiseSize;
  const finalAmount = validation.normalizedAmount ?? amount;

  switch (action) {
    case "fold":
      newSeats[seatId] = { ...seat, status: "folded" };
      break;

    case "check":
      // Check only valid if no bet to call
      if (table.currentBet > seat.streetCommitted) {
        return { nextState: table, sideEffects: [] }; // Invalid check
      }
      break;

    case "call":
      const toCall = table.currentBet - seat.streetCommitted;
      const callAmount = Math.min(toCall, seat.chips);
      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - callAmount,
        committed: seat.committed + callAmount,
        streetCommitted: seat.streetCommitted + callAmount,
        status: seat.chips === callAmount ? "allin" : "active",
      };
      break;

    case "bet": {
      // No existing bet: commit the bet amount
      const betAmount = Math.min(finalAmount, seat.chips);
      const newStreetCommitted = seat.streetCommitted + betAmount;
      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - betAmount,
        committed: seat.committed + betAmount,
        streetCommitted: newStreetCommitted,
        status: seat.chips === betAmount ? "allin" : "active",
      };
      newCurrentBet = Math.max(newCurrentBet, newStreetCommitted);
      newLastAggressor = seatId;
      newLastRaiseSize = betAmount;
      break;
    }
    case "raise": {
      // Must first call up to currentBet, then add raise increment
      const toCall = Math.max(0, table.currentBet - seat.streetCommitted);
      const raiseInc = Math.min(finalAmount, Math.max(0, seat.chips - toCall));
      const totalPutIn = Math.min(seat.chips, toCall + raiseInc);
      const newStreetCommitted = seat.streetCommitted + totalPutIn;
      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - totalPutIn,
        committed: seat.committed + totalPutIn,
        streetCommitted: newStreetCommitted,
        status: seat.chips === totalPutIn ? "allin" : "active",
      };
      newCurrentBet = Math.max(newCurrentBet, newStreetCommitted);
      newLastAggressor = seatId;
      newLastRaiseSize = raiseInc;
      break;
    }

    case "allin":
      const allInAmount = seat.chips;
      const allInStreetCommitted = seat.streetCommitted + allInAmount;
      newSeats[seatId] = {
        ...seat,
        chips: 0,
        committed: seat.committed + allInAmount,
        streetCommitted: allInStreetCommitted,
        status: "allin",
      };
      if (allInStreetCommitted > table.currentBet) {
        newLastRaiseSize = allInStreetCommitted - table.currentBet;
        newCurrentBet = allInStreetCommitted;
        newLastAggressor = seatId;
      }
      break;
  }

  // Track BB action in preflop using game rules
  let bbHasActed = table.bbHasActed;
  if (table.phase === "preflop" && seatId === table.bbSeat) {
    bbHasActed = true;
    console.log(`💰 [Reducer] BB (seat ${seatId}) has now acted`);
  }

  // Create intermediate table state to check betting round completion
  const updatedTable = {
    ...table,
    seats: newSeats,
    currentBet: newCurrentBet,
    lastAggressor: newLastAggressor,
    lastRaiseSize: newLastRaiseSize,
    bbHasActed,
  };

  // Use proper state machine logic for next actor
  const nextActorResult = getNextActor(updatedTable);

  const nextState = {
    ...updatedTable,
    actor: nextActorResult.actor,
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "action_applied" } },
  ];

  // STOP timer for current player who just acted
  if (seat.pid) {
    sideEffects.push({
      type: "STOP_TIMER",
      payload: { playerId: seat.pid },
    });
    console.log(`⏰ [Reducer] Stopping timer for ${seat.pid} who just acted`);
  }

  // Start timer for next actor if needed
  if (nextActorResult.actor !== undefined && nextActorResult.actor >= 0) {
    const nextSeat = nextState.seats[nextActorResult.actor];
    if (nextSeat.pid && nextSeat.status === "active") {
      sideEffects.push({
        type: "START_TIMER",
        payload: {
          playerId: nextSeat.pid,
          seatId: nextActorResult.actor,
          timeoutMs: ACTION_TIMEOUT_MS,
        },
      });
    }
  }

  // If betting round is complete, schedule next transition events
  const roundState = getBettingRoundState(nextState);
  if (roundState.isComplete) {
    // Collect into pots
    sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'CloseStreet' } } });

    const currentStreet = nextState.street;
    const nextStreet = currentStreet ? getNextStreet(currentStreet as Street) : null;
    const atRiver = !nextStreet;
    const allInOrFold = roundState.reason === 'all-players-allin' || roundState.reason === 'fold-to-one';

    if (atRiver || allInOrFold) {
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'Showdown', results: [] } } });
    } else if (nextStreet) {
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'EnterStreet', street: nextStreet, isAutoDealt: roundState.reason === 'all-players-allin' } } });
    }
  }

  return { nextState, sideEffects };
}

/**
 * Close current betting street
 */
function closeStreet(table: Table): StateTransition {
  // Collect committed chips into pots
  const { pots } = collectIntoPots(table.seats);

  const nextState = {
    ...table,
    pots,
    actor: undefined,
  };

  const sideEffects: SideEffect[] = [
    { type: "CLEAR_TIMERS", payload: {} },
    { type: "EMIT_STATE_CHANGE", payload: { reason: "street_closed" } },
  ];

  return { nextState, sideEffects };
}

/**
 * Process showdown results
 * Note: Hand evaluation is done by the EventEngine, reducer just transitions state
 */
function processShowdown(table: Table, results: any[]): StateTransition {
  // Count players still in hand
  const playersInHand = table.seats.filter(seat => 
    seat.pid && 
    (seat.status === "active" || seat.status === "allin")
  ).length;

  console.log(`🃏 [Reducer] Starting showdown with ${playersInHand} players`);

  const nextState = {
    ...table,
    phase: "showdown" as Phase,
    // Clear the actor since no more betting
    actor: undefined,
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "showdown_started" } },
  ];

  // If only one player left, they win immediately
  if (playersInHand <= 1) {
    console.log(`🏆 [Reducer] Only ${playersInHand} player(s) remaining - immediate win`);
    sideEffects.push({ 
      type: "EMIT_STATE_CHANGE", 
      payload: { reason: "win_by_elimination" } 
    });
  } else {
    console.log(`🃏 [Reducer] Multiple players - cards will be evaluated`);
    sideEffects.push({ 
      type: "EMIT_STATE_CHANGE", 
      payload: { reason: "revealing_cards" } 
    });
  }

  return {
    nextState,
    sideEffects,
  };
}

/**
 * Process payout distributions with winner announcements
 */
function processPayout(
  table: Table,
  distributions: PayoutDistribution[],
): StateTransition {
  const newSeats = [...table.seats];

  console.log(`💰 [Reducer] Processing payouts for ${distributions.length} distributions`);

  // Distribute winnings and log winners
  distributions.forEach((dist) => {
    const seatIndex = newSeats.findIndex((seat) => seat.pid === dist.pid);
    if (seatIndex !== -1) {
      const oldChips = newSeats[seatIndex].chips;
      newSeats[seatIndex] = {
        ...newSeats[seatIndex],
        chips: oldChips + dist.amount,
      };
      
      console.log(`💰 [Reducer] ${dist.pid} wins $${dist.amount} (${dist.reason}) - ${oldChips} → ${oldChips + dist.amount} chips`);
    }
  });

  // Calculate total pot distributed
  const totalPayout = distributions.reduce((sum, dist) => sum + dist.amount, 0);
  const totalPots = table.pots.reduce((sum, pot) => sum + pot.amount, 0);
  
  console.log(`💰 [Reducer] Total distributed: $${totalPayout} from $${totalPots} in pots`);

  // Immediately transition to handEnd phase to prevent infinite loops
  const nextState = {
    ...table,
    phase: "handEnd" as Phase,
    seats: newSeats,
    pots: [], // Clear pots after payout
    actor: undefined,
    lastAggressor: undefined,
    currentBet: 0,
    lastRaiseSize: table.bigBlind,
  };

  // Side effects: announce winners and schedule next hand
  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "winners_announced" } },
    { type: "EMIT_STATE_CHANGE", payload: { reason: "payout_complete" } },
    {
      type: "DISPATCH_EVENT",
      payload: { event: { t: "HandEnd" }, delayMs: 5000 },
    },
  ];

  return { nextState, sideEffects };
}

/**
 * End hand and prepare for next
 */
function endHand(table: Table): StateTransition {
  // Remove broke players (0 chips) from the table
  const newSeats = table.seats.map((seat) => {
    if (seat.pid && seat.chips === 0) {
      console.log(`💸 [Reducer] Removing broke player ${seat.pid} from seat ${seat.id}`);
      return {
        id: seat.id,
        chips: 0,
        committed: 0,
        streetCommitted: 0,
        status: "empty" as SeatStatus,
      };
    }
    return seat;
  });

  // Calculate next button using game rules
  const nextButton = calculateNextButton(newSeats, table.button);
  const buttonMoved = nextButton !== table.button;

  console.log(
    `🔄 [Reducer] Button ${buttonMoved ? "advanced" : "stayed"}: ${table.button} → ${nextButton}`,
  );

  // Count remaining players with chips
  const playersWithChips = newSeats.filter(seat => seat.pid && seat.chips > 0).length;
  console.log(`👥 [Reducer] ${playersWithChips} players remaining with chips`);

  const nextState = {
    ...table,
    phase: "waiting" as Phase,
    street: undefined,
    actor: undefined,
    lastAggressor: undefined,
    currentBet: 0,
    lastRaiseSize: table.bigBlind,
    communityCards: [],
    button: nextButton,
    seats: newSeats,
    bbSeat: undefined, // Reset BB tracking
    bbHasActed: false, // Reset BB action tracking
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "hand_ended" } },
  ];

  // Emit button movement notification
  if (buttonMoved) {
    sideEffects.push({
      type: "EMIT_STATE_CHANGE",
      payload: { reason: "button_moved" },
    });
  }

  // Emit notification if players were removed
  const brokePlayersRemoved = table.seats.filter((seat, index) => 
    seat.pid && newSeats[index].status === "empty"
  ).length;
  
  if (brokePlayersRemoved > 0) {
    sideEffects.push({
      type: "EMIT_STATE_CHANGE",
      payload: { reason: "broke_players_removed" },
    });
  }

  return { nextState, sideEffects };
}

/**
 * Add player to table with proper validation
 */
function addPlayer(
  table: Table,
  seatId: number,
  pid: string,
  chips: number,
  nickname?: string,
): StateTransition {
  // Validate seat index
  if (seatId < 0 || seatId >= table.seats.length) {
    console.error(`❌ [Reducer] Invalid seat index: ${seatId}`);
    return { nextState: table, sideEffects: [] }; // Invalid seat
  }

  // Check if seat is already occupied
  if (table.seats[seatId].pid) {
    console.error(
      `❌ [Reducer] Seat ${seatId} is already occupied by ${table.seats[seatId].pid}`,
    );
    return { nextState: table, sideEffects: [] }; // Seat taken
  }

  // Check if player is already seated elsewhere
  const existingSeat = table.seats.find((seat) => seat.pid === pid);
  if (existingSeat) {
    console.error(
      `❌ [Reducer] Player ${pid} is already seated at seat ${existingSeat.id}`,
    );
    return { nextState: table, sideEffects: [] }; // Player already seated
  }

  // Validate chips amount with buy-in limits
  const minBuyIn = table.bigBlind * 20;  // 20 big blinds minimum
  const maxBuyIn = table.bigBlind * 200; // 200 big blinds maximum
  
  if (chips <= 0) {
    console.error(`❌ [Reducer] Invalid chips amount: ${chips} (must be > 0)`);
    return { nextState: table, sideEffects: [] }; // Invalid chips
  }
  
  if (chips < minBuyIn) {
    console.error(`❌ [Reducer] Buy-in too small: ${chips} (minimum: ${minBuyIn})`);
    return { nextState: table, sideEffects: [] }; // Buy-in too small
  }
  
  if (chips > maxBuyIn) {
    console.error(`❌ [Reducer] Buy-in too large: ${chips} (maximum: ${maxBuyIn})`);
    return { nextState: table, sideEffects: [] }; // Buy-in too large
  }

  const newSeats = [...table.seats];
  newSeats[seatId] = {
    id: seatId,
    pid,
    chips,
    committed: 0,
    streetCommitted: 0,
    status: "active",
    nickname,
  };

  console.log(
    `✅ [Reducer] Added player ${pid} to seat ${seatId} with ${chips} chips`,
  );

  const nextState = {
    ...table,
    seats: newSeats,
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "player_joined" } },
  ];

  return { nextState, sideEffects };
}

/**
 * Remove player from table
 */
function removePlayer(
  table: Table,
  seatId: number,
  pid: string,
): StateTransition {
  const newSeats = [...table.seats];
  if (newSeats[seatId]?.pid === pid) {
    newSeats[seatId] = {
      id: seatId,
      chips: 0,
      committed: 0,
      streetCommitted: 0,
      status: "empty",
    };
  }

  const nextState = {
    ...table,
    seats: newSeats,
  };

  const sideEffects: SideEffect[] = [
    { type: "EMIT_STATE_CHANGE", payload: { reason: "player_left" } },
  ];

  return { nextState, sideEffects };
}
/**
 * Handle timeout auto-fold with proper validation
 * Gracefully handles race conditions where player already acted
 */
function handleTimeoutAutoFold(table: Table, seatId: number): StateTransition {
  console.log(`⏰ [Reducer] Processing timeout auto-fold for seat ${seatId}`);

  // Check if seat is still the current actor
  if (table.actor !== seatId) {
    console.log(
      `⏰ [Reducer] Ignoring timeout for seat ${seatId} - no longer actor (current: ${table.actor})`,
    );

    // Return unchanged state with notification side effect
    return {
      nextState: table,
      sideEffects: [
        { type: "EMIT_STATE_CHANGE", payload: { reason: "timeout_ignored" } },
      ],
    };
  }

  // Validate seat exists and is actionable
  const seat = table.seats[seatId];
  if (!seat || seat.status !== "active" || !seat.pid) {
    console.warn(
      `⏰ [Reducer] Cannot timeout seat ${seatId} - invalid state: ${seat?.status}`,
    );

    return {
      nextState: table,
      sideEffects: [
        {
          type: "EMIT_STATE_CHANGE",
          payload: { reason: "timeout_invalid_seat" },
        },
      ],
    };
  }

  console.log(`⏰ [Reducer] Auto-folding ${seat.pid} at seat ${seatId}`);

  // Apply fold for current actor - this will handle timer cleanup
  const foldResult = applyAction(table, seatId, "fold");

  // Add timeout-specific side effects
  const timeoutSideEffects: SideEffect[] = [
    ...foldResult.sideEffects,
    { type: "EMIT_STATE_CHANGE", payload: { reason: "player_timeout_folded" } },
  ];

  return {
    nextState: foldResult.nextState,
    sideEffects: timeoutSideEffects,
  };
}
