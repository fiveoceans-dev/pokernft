/**
 * Action Validation Functions
 * 
 * Pure validation functions that return results instead of throwing exceptions.
 * Comprehensive validation for all poker actions with detailed error messages.
 */

import { 
  Table, 
  Seat, 
  ActionType, 
  ActionValidation,
  Street 
} from '../core/types';

import { 
  getToCallAmount, 
  canCheck, 
  countActivePlayers 
} from '../utils/ringOrder';

/**
 * Comprehensive action validation with detailed error reporting
 */
export function validateAction(
  table: Table,
  seatId: number,
  action: ActionType,
  amount: number = 0
): ActionValidation {
  // Basic precondition checks
  const basicValidation = validateBasicPreconditions(table, seatId);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  const seat = table.seats[seatId];
  
  // Action-specific validation
  switch (action) {
    case "fold":
      return validateFold(table, seat);
      
    case "check":
      return validateCheck(table, seat);
      
    case "call":
      return validateCall(table, seat);
      
    case "bet":
      return validateBet(table, seat, amount);
      
    case "raise":
      return validateRaise(table, seat, amount);
      
    case "allin":
      return validateAllIn(table, seat);
      
    default:
      return { valid: false, error: "Unknown action type" };
  }
}

/**
 * Validate basic preconditions for any action
 */
function validateBasicPreconditions(table: Table, seatId: number): ActionValidation {
  // Seat bounds check
  if (seatId < 0 || seatId >= table.seats.length) {
    return { valid: false, error: "Invalid seat index" };
  }

  const seat = table.seats[seatId];

  // Player presence check
  if (!seat.pid) {
    return { valid: false, error: "Seat is empty" };
  }

  // Player status check
  if (seat.status !== "active") {
    return { valid: false, error: `Player is ${seat.status}, not active` };
  }

  // Turn validation
  if (table.actor !== seatId) {
    return { valid: false, error: "Not player's turn" };
  }

  // Game phase validation
  if (!isValidBettingPhase(table.phase)) {
    return { valid: false, error: `Cannot act during ${table.phase} phase` };
  }

  return { valid: true };
}

/**
 * Validate fold action
 */
function validateFold(table: Table, seat: Seat): ActionValidation {
  // Fold is almost always valid for active players
  return { valid: true };
}

/**
 * Validate check action
 */
function validateCheck(table: Table, seat: Seat): ActionValidation {
  const toCall = getToCallAmount(seat, table.currentBet);
  
  if (toCall > 0) {
    return { 
      valid: false, 
      error: `Cannot check with $${toCall} to call` 
    };
  }

  return { valid: true };
}

/**
 * Validate call action
 */
function validateCall(table: Table, seat: Seat): ActionValidation {
  const toCall = getToCallAmount(seat, table.currentBet);
  
  if (toCall === 0) {
    return { 
      valid: false, 
      error: "No bet to call (use check instead)" 
    };
  }

  if (seat.chips < toCall) {
    return { 
      valid: false, 
      error: `Insufficient chips to call $${toCall} (have $${seat.chips})` 
    };
  }

  return { valid: true };
}

/**
 * Validate bet action
 */
function validateBet(table: Table, seat: Seat, amount: number): ActionValidation {
  // Check if betting is allowed (no existing bet)
  if (table.currentBet > 0) {
    return { 
      valid: false, 
      error: "Cannot bet when there's already a bet (use raise instead)" 
    };
  }

  return validateBetAmount(table, seat, amount);
}

/**
 * Validate raise action  
 */
function validateRaise(table: Table, seat: Seat, amount: number): ActionValidation {
  // Check if raising is allowed (existing bet required)
  if (table.currentBet === 0) {
    return { 
      valid: false, 
      error: "Cannot raise without an existing bet (use bet instead)" 
    };
  }

  const toCall = getToCallAmount(seat, table.currentBet);
  return validateRaiseAmount(table, seat, amount, toCall);
}

/**
 * Validate all-in action
 */
function validateAllIn(table: Table, seat: Seat): ActionValidation {
  if (seat.chips === 0) {
    return { 
      valid: false, 
      error: "No chips available for all-in" 
    };
  }

  return { valid: true };
}

/**
 * Validate bet amount according to poker rules
 */
function validateBetAmount(table: Table, seat: Seat, amount: number): ActionValidation {
  if (!isValidAmount(amount)) {
    return { valid: false, error: "Invalid bet amount" };
  }

  if (amount > seat.chips) {
    return { 
      valid: false, 
      error: `Bet amount $${amount} exceeds available chips $${seat.chips}` 
    };
  }

  // Check minimum bet (typically big blind)
  const minBet = getMinimumBet(table);
  
  if (amount < minBet && amount < seat.chips) {
    return { 
      valid: false, 
      error: `Minimum bet is $${minBet} (or go all-in with $${seat.chips})` 
    };
  }

  return { valid: true, normalizedAmount: amount };
}

/**
 * Validate raise amount with min-raise calculation
 */
function validateRaiseAmount(
  table: Table, 
  seat: Seat, 
  amount: number, 
  toCall: number
): ActionValidation {
  if (!isValidAmount(amount)) {
    return { valid: false, error: "Invalid raise amount" };
  }

  const totalRequired = toCall + amount;
  
  if (totalRequired > seat.chips) {
    return { 
      valid: false, 
      error: `Raise total $${totalRequired} exceeds available chips $${seat.chips}` 
    };
  }

  // Calculate minimum raise
  const minRaise = calculateMinimumRaise(table);
  
  if (amount < minRaise && totalRequired < seat.chips) {
    return { 
      valid: false, 
      error: `Minimum raise is $${minRaise} (or go all-in with remaining $${seat.chips - toCall})` 
    };
  }

  return { valid: true, normalizedAmount: amount };
}

/**
 * Calculate minimum bet for current table/street
 */
function getMinimumBet(table: Table): number {
  // Standard minimum is big blind
  return table.bigBlind;
}

/**
 * Calculate minimum raise amount (last bet/raise size)
 */
function calculateMinimumRaise(table: Table): number {
  // In a full implementation, track the last bet/raise size
  // For now, use big blind as minimum raise
  // TODO: Implement proper bet sizing history
  return Math.max(table.bigBlind, table.currentBet);
}

/**
 * Check if a phase allows betting actions
 */
function isValidBettingPhase(phase: string): boolean {
  return ["preflop", "flop", "turn", "river"].includes(phase);
}

/**
 * Validate numeric amount
 */
function isValidAmount(amount: number): boolean {
  return typeof amount === 'number' && 
         amount >= 0 && 
         Number.isFinite(amount) &&
         Number.isInteger(amount);
}

/**
 * Advanced validation for tournament scenarios
 */
export function validateTournamentAction(
  table: Table,
  seatId: number,
  action: ActionType,
  amount: number = 0
): ActionValidation {
  // First run standard validation
  const standardValidation = validateAction(table, seatId, action, amount);
  if (!standardValidation.valid) {
    return standardValidation;
  }

  // Additional tournament-specific rules
  const seat = table.seats[seatId];
  
  // Example: No betting allowed if ante not posted
  if (table.blinds.ante && seat.committed === 0) {
    return { 
      valid: false, 
      error: "Must post ante before acting" 
    };
  }

  return standardValidation;
}

/**
 * Validate string format for better UI integration
 */
export function validateActionFromString(
  table: Table,
  seatId: number,
  actionStr: string,
  amountStr: string = "0"
): ActionValidation {
  // Normalize action string
  const action = actionStr.toLowerCase().trim() as ActionType;
  
  if (!["fold", "check", "call", "bet", "raise", "allin"].includes(action)) {
    return { valid: false, error: `Invalid action: ${actionStr}` };
  }

  // Parse amount
  const amount = parseFloat(amountStr);
  if (!isValidAmount(amount)) {
    return { valid: false, error: `Invalid amount: ${amountStr}` };
  }

  return validateAction(table, seatId, action, amount);
}

/**
 * Get available actions for a seat (for UI)
 */
export function getAvailableActions(table: Table, seatId: number): ActionType[] {
  const validation = validateBasicPreconditions(table, seatId);
  if (!validation.valid) {
    return [];
  }

  const seat = table.seats[seatId];
  const toCall = getToCallAmount(seat, table.currentBet);
  const actions: ActionType[] = ["fold"];

  // Check
  if (toCall === 0) {
    actions.push("check");
  }

  // Call
  if (toCall > 0 && seat.chips >= toCall) {
    actions.push("call");
  }

  // Bet
  if (table.currentBet === 0 && seat.chips >= getMinimumBet(table)) {
    actions.push("bet");
  }

  // Raise
  if (table.currentBet > 0 && seat.chips > toCall) {
    const minRaise = calculateMinimumRaise(table);
    if (seat.chips >= toCall + minRaise) {
      actions.push("raise");
    }
  }

  // All-in (always available if player has chips)
  if (seat.chips > 0) {
    actions.push("allin");
  }

  return actions;
}

/**
 * Get betting limits for UI sliders/inputs
 */
export interface BettingLimits {
  minBet: number;
  maxBet: number;
  minRaise: number;
  maxRaise: number;
  toCall: number;
}

export function getBettingLimits(table: Table, seatId: number): BettingLimits {
  const seat = table.seats[seatId];
  
  if (!seat || seat.status !== "active") {
    return { minBet: 0, maxBet: 0, minRaise: 0, maxRaise: 0, toCall: 0 };
  }

  const toCall = getToCallAmount(seat, table.currentBet);
  const minBet = getMinimumBet(table);
  const minRaise = calculateMinimumRaise(table);
  
  return {
    minBet,
    maxBet: seat.chips,
    minRaise,
    maxRaise: Math.max(0, seat.chips - toCall),
    toCall
  };
}