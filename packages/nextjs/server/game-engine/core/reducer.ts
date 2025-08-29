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
    phase: "preflop" as Phase,
    street: "preflop" as Street,
    seats: newSeats,
    currentBet: bb,
    lastRaiseSize: bb,
    actor: actionOrder.actor,
    blinds: { sb, bb, ante },
    bbSeat: bbIndex, // Track BB position for option logic
    bbHasActed: false, // BB hasn't acted yet
  };

  console.log(
    `🎯 [Reducer] First actor: seat ${actionOrder.actor} (${newSeats[actionOrder.actor]?.pid})`,
  );

  // Side effects: deal hole cards, emit state changes, start timers
  const sideEffects: SideEffect[] = [
    {
      type: "DISPATCH_EVENT",
      payload: {
        event: { t: "DealHole", cards: {} }, // Cards will be generated by engine
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

  // Start action timer if we have a valid first actor
  if (actionOrder.actor !== -1 && actionOrder.actor < newSeats.length) {
    const actorSeat = newSeats[actionOrder.actor];
    if (actorSeat.pid && actorSeat.status === "active") {
      sideEffects.push({
        type: "START_TIMER",
        payload: {
          playerId: actorSeat.pid,
          seatId: actionOrder.actor,
          timeoutMs: ACTION_TIMEOUT_MS,
        },
      });
      console.log(`⏰ [Reducer] Started timer for ${actorSeat.pid} (${ACTION_TIMEOUT_MS}ms)`);
    }
  }

  return { nextState, sideEffects };
}

/**
 * Apply hole cards to active players (pure state update)
 */
function applyHoleCards(
  table: Table,
  cards: Record<string, [number, number]>,
): StateTransition {
  const newSeats = table.seats.map((seat) => {
    if (seat.pid && cards[seat.pid]) {
      return {
        ...seat,
        holeCards: cards[seat.pid],
      };
    }
    return seat;
  });

  const nextState = {
    ...table,
    seats: newSeats,
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

  const communityCards = cards
    ? [...table.communityCards, ...cards]
    : table.communityCards;

  // Determine first actor unless explicitly auto-dealt
  let actor: number | undefined = undefined;
  if (!isAutoDealt) {
    const tableWithSeats = { ...table, seats: newSeats };
    const actionOrder = getFirstActor(tableWithSeats, false);
    actor = actionOrder.actor === -1 ? undefined : actionOrder.actor;
    console.log(`🎯 [Reducer] ${street} first actor: seat ${actor} (${actor !== undefined ? newSeats[actor]?.pid : "none"})`);
  }

  const nextState = {
    ...table,
    phase: street,
    street,
    seats: newSeats,
    currentBet: 0,
    lastRaiseSize: table.bigBlind,
    lastAggressor: undefined,
    actor, // Will be undefined for all-in scenarios
    communityCards,
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

  // Fail-safe progression: if no actor or round is trivially complete, schedule next transitions
  const roundState = getBettingRoundState(nextState);
  if (roundState.isComplete || actor === undefined) {
    // Collect into pots then proceed
    sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'CloseStreet' } } });
    const currentStreet = nextState.street;
    const nextStreet = currentStreet ? getNextStreet(currentStreet as Street) : null;
    const atRiver = !nextStreet;
    if (atRiver || roundState.reason === 'all-players-allin' || roundState.reason === 'fold-to-one') {
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'Showdown', results: [] } } });
    } else if (nextStreet) {
      // Auto-deal next street when all-in (no actor)
      sideEffects.push({ type: 'DISPATCH_EVENT', payload: { event: { t: 'EnterStreet', street: nextStreet, isAutoDealt: roundState.reason === 'all-players-allin' || actor === undefined } } });
    }
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
 */
function processShowdown(table: Table, results: any[]): StateTransition {
  const nextState = {
    ...table,
    phase: "showdown" as Phase,
  };

  return {
    nextState,
    sideEffects: [
      { type: "EMIT_STATE_CHANGE", payload: { reason: "showdown_started" } },
    ],
  };
}

/**
 * Process payout distributions
 */
function processPayout(
  table: Table,
  distributions: PayoutDistribution[],
): StateTransition {
  const newSeats = [...table.seats];

  // Distribute winnings
  distributions.forEach((dist) => {
    const seatIndex = newSeats.findIndex((seat) => seat.pid === dist.pid);
    if (seatIndex !== -1) {
      newSeats[seatIndex] = {
        ...newSeats[seatIndex],
        chips: newSeats[seatIndex].chips + dist.amount,
      };
    }
  });

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

  // Side effect: schedule next hand after delay
  const sideEffects: SideEffect[] = [
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
  // Calculate next button using game rules
  const nextButton = calculateNextButton(table.seats, table.button);
  const buttonMoved = nextButton !== table.button;

  console.log(
    `🔄 [Reducer] Button ${buttonMoved ? "advanced" : "stayed"}: ${table.button} → ${nextButton}`,
  );

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

  // Validate chips amount
  if (chips <= 0) {
    console.error(`❌ [Reducer] Invalid chips amount: ${chips}`);
    return { nextState: table, sideEffects: [] }; // Invalid chips
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
