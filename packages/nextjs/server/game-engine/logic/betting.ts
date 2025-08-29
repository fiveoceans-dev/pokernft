/**
 * Betting Logic for Event-Driven Poker Engine
 *
 * Pure functions for betting round management:
 * - enterStreet() - Initialize new betting round
 * - applyAction() - Process player actions
 * - Betting round invariants and completion detection
 */

import {
  Table,
  Seat,
  Street,
  ActionType,
  SeatStatus,
  ActionValidation,
  BettingRoundState,
} from "../core/types";

import {
  getFirstActor,
  getNextActor,
  getBettingRoundState,
  getToCallAmount,
  canCheck,
  countActivePlayers,
  countPlayersInHand,
} from "../utils/ringOrder";

/**
 * Enter new betting street with proper initialization
 */
export function enterStreet(
  table: Table,
  street: Street,
  communityCards?: number[],
): Table {
  const newSeats = table.seats.map((seat) => ({
    ...seat,
    streetCommitted: 0, // Reset street commitments
  }));

  const newCommunityCards = communityCards
    ? [...table.communityCards, ...communityCards]
    : table.communityCards;

  const firstActor = getFirstActor({ ...table, seats: newSeats }, false); // postflop

  return {
    ...table,
    phase: street,
    street,
    seats: newSeats,
    currentBet: 0,
    lastRaiseSize: table.bigBlind,
    lastAggressor: undefined,
    actor: firstActor,
    communityCards: newCommunityCards,
  };
}

/**
 * Apply player action with full validation and state updates
 */
export function applyAction(
  table: Table,
  seatId: number,
  action: ActionType,
  amount: number = 0,
): Table {
  const validation = validateAction(table, seatId, action, amount);

  if (!validation.valid) {
    return table; // Invalid action - no state change
  }

  const seat = table.seats[seatId];
  const newSeats = [...table.seats];
  let newCurrentBet = table.currentBet;
  let newLastAggressor = table.lastAggressor;
  let newLastRaiseSize = table.lastRaiseSize;

  const finalAmount = validation.normalizedAmount ?? amount;

  // Apply action to seat
  switch (action) {
    case "fold":
      newSeats[seatId] = {
        ...seat,
        status: "folded" as SeatStatus,
      };
      break;

    case "check":
      // No state changes needed for check
      break;

    case "call": {
      const callAmount = finalAmount;

      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - callAmount,
        committed: seat.committed + callAmount,
        streetCommitted: seat.streetCommitted + callAmount,
        status: seat.chips === callAmount ? "allin" : "active",
      };
      break;
    }

    case "bet":
    case "raise": {
      const betAmount = Math.min(finalAmount, seat.chips);
      const newStreetCommitted = seat.streetCommitted + betAmount;

      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - betAmount,
        committed: seat.committed + betAmount,
        streetCommitted: newStreetCommitted,
        status: seat.chips === betAmount ? "allin" : "active",
      };

      const raiseSize = newStreetCommitted - table.currentBet;
      newCurrentBet = Math.max(newCurrentBet, newStreetCommitted);
      newLastAggressor = seatId;
      newLastRaiseSize = raiseSize;
      break;
    }

    case "allin": {
      const allInAmount = seat.chips;
      const newStreetCommitted = seat.streetCommitted + allInAmount;

      newSeats[seatId] = {
        ...seat,
        chips: 0,
        committed: seat.committed + allInAmount,
        streetCommitted: newStreetCommitted,
        status: "allin" as SeatStatus,
      };

      // All-in can be a raise if it increases the current bet
      if (newStreetCommitted > table.currentBet) {
        newCurrentBet = newStreetCommitted;
        newLastAggressor = seatId;
        newLastRaiseSize = newStreetCommitted - table.currentBet;
      }
      break;
    }
  }

  // Calculate next actor
  const updatedTable = {
    ...table,
    seats: newSeats,
    currentBet: newCurrentBet,
    lastAggressor: newLastAggressor,
    lastRaiseSize: newLastRaiseSize,
  };

  const nextActorResult = getNextActor(updatedTable);

  return {
    ...updatedTable,
    actor: nextActorResult.actor,
  };
}

/**
 * Validate player action with detailed error reporting
 */
export function validateAction(
  table: Table,
  seatId: number,
  action: ActionType,
  amount: number = 0,
): ActionValidation {
  // Basic seat validation
  if (seatId < 0 || seatId >= table.seats.length) {
    return { valid: false, error: "Invalid seat index" };
  }

  const seat = table.seats[seatId];

  if (!seat.pid) {
    return { valid: false, error: "Seat is empty" };
  }

  if (seat.status !== "active") {
    return { valid: false, error: "Player is not active" };
  }

  if (table.actor !== seatId) {
    return { valid: false, error: "Not player's turn" };
  }

  const toCall = getToCallAmount(seat, table.currentBet);

  // Action-specific validation
  switch (action) {
    case "fold":
      return { valid: true };

    case "check":
      if (toCall > 0) {
        return { valid: false, error: "Cannot check with bet to call" };
      }
      return { valid: true };

    case "call":
      if (toCall === 0) {
        return { valid: false, error: "No bet to call" };
      }
      const callAmount = Math.min(toCall, seat.chips);
      const isAllIn = seat.chips <= toCall;
      return { valid: true, normalizedAmount: callAmount, isAllIn };

    case "bet":
      if (table.currentBet > 0) {
        return {
          valid: false,
          error: "Cannot bet when there's already a bet (must raise)",
        };
      }
      return validateBetAmount(seat, amount, table.bigBlind);

    case "raise":
      if (table.currentBet === 0) {
        return { valid: false, error: "Cannot raise without a bet (must bet)" };
      }
      return validateRaiseAmount(table, seat, amount, toCall);

    case "allin":
      if (seat.chips === 0) {
        return { valid: false, error: "No chips to go all-in" };
      }
      return { valid: true };

    default:
      return { valid: false, error: "Unknown action type" };
  }
}

/**
 * Validate bet amount according to poker rules
 */
function validateBetAmount(
  seat: Seat,
  amount: number,
  bigBlind: number,
): ActionValidation {
  if (amount <= 0) {
    return { valid: false, error: "Bet amount must be positive" };
  }

  if (amount > seat.chips) {
    return { valid: false, error: "Bet amount exceeds available chips" };
  }

  // Minimum bet is big blind
  const minBet = bigBlind;
  if (amount < minBet && amount < seat.chips) {
    return {
      valid: false,
      error: `Minimum bet is ${minBet} (or all-in)`,
    };
  }

  return { valid: true, normalizedAmount: amount };
}

/**
 * Validate raise amount with min-raise rules
 */
function validateRaiseAmount(
  table: Table,
  seat: Seat,
  amount: number,
  toCall: number,
): ActionValidation {
  if (amount <= 0) {
    return { valid: false, error: "Raise amount must be positive" };
  }

  const totalRequired = toCall + amount;

  if (totalRequired > seat.chips) {
    return { valid: false, error: "Raise amount exceeds available chips" };
  }

  // Calculate minimum raise based on last bet/raise size
  const lastBetSize = calculateLastBetSize(table);
  const minRaise = lastBetSize;

  if (amount < minRaise && totalRequired < seat.chips) {
    return {
      valid: false,
      error: `Minimum raise is ${minRaise} (or all-in)`,
    };
  }

  return { valid: true, normalizedAmount: amount };
}

/**
 * Calculate the size of the last bet or raise for min-raise calculation
 */
function calculateLastBetSize(table: Table): number {
  return table.lastRaiseSize || table.bigBlind;
}

/**
 * Check if betting round is complete
 */
export function isBettingRoundComplete(table: Table): boolean {
  const state = getBettingRoundState(table);
  return state.isComplete;
}

/**
 * Get next street after current betting round completes
 */
export function getNextStreet(currentStreet: Street): Street | null {
  const streetOrder: Street[] = ["preflop", "flop", "turn", "river"];
  const currentIndex = streetOrder.indexOf(currentStreet);

  if (currentIndex === -1 || currentIndex === streetOrder.length - 1) {
    return null; // Invalid street or river (go to showdown)
  }

  return streetOrder[currentIndex + 1];
}

/**
 * Calculate betting statistics for UI display
 */
export interface BettingStats {
  potSize: number;
  toCall: number;
  minBet: number;
  minRaise: number;
  maxBet: number;
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
}

export function getBettingStats(table: Table, seatId: number): BettingStats {
  const seat = table.seats[seatId];
  const toCall = seat ? getToCallAmount(seat, table.currentBet) : 0;
  const potSize =
    table.pots.reduce((sum, pot) => sum + pot.amount, 0) +
    table.seats.reduce((sum, s) => sum + s.committed, 0);

  if (!seat || seat.status !== "active" || table.actor !== seatId) {
    return {
      potSize,
      toCall: 0,
      minBet: 0,
      minRaise: 0,
      maxBet: 0,
      canCheck: false,
      canCall: false,
      canBet: false,
      canRaise: false,
    };
  }

  const minBet = table.bigBlind;
  const minRaise = calculateLastBetSize(table);
  const maxBet = seat.chips;

  return {
    potSize,
    toCall,
    minBet,
    minRaise,
    maxBet,
    canCheck: canCheck(seat, table.currentBet),
    canCall: toCall > 0 && seat.chips > 0,
    canBet: table.currentBet === 0 && seat.chips >= minBet,
    canRaise: table.currentBet > 0 && seat.chips >= toCall + minRaise,
  };
}
