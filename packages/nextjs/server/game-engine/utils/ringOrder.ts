/**
 * Ring Order Helper for Poker Turn Management
 * 
 * Handles circular seat traversal with poker-specific rules:
 * - Clockwise movement around the table
 * - Skip folded, all-in, and empty seats
 * - Handle heads-up exception (button first preflop)
 * - Determine betting round completion
 */

import { Table, Seat, SeatStatus, NextActorResult, BettingRoundState } from '../core/newTypes';

/**
 * Check if a seat can take actions
 */
export function isActionable(seat: Seat): boolean {
  return seat.status === "active" && seat.pid !== undefined;
}

/**
 * Get next actionable seat index clockwise from start position
 */
export function getNextActionableIndex(seats: Seat[], startIndex: number): number {
  const seatCount = seats.length;
  
  for (let i = 1; i <= seatCount; i++) {
    const index = (startIndex + i) % seatCount;
    const seat = seats[index];
    
    if (isActionable(seat)) {
      return index;
    }
  }
  
  return -1; // No actionable seats found
}

/**
 * Get previous actionable seat index counter-clockwise from start position
 */
export function getPrevActionableIndex(seats: Seat[], startIndex: number): number {
  const seatCount = seats.length;
  
  for (let i = 1; i <= seatCount; i++) {
    const index = (startIndex - i + seatCount) % seatCount;
    const seat = seats[index];
    
    if (isActionable(seat)) {
      return index;
    }
  }
  
  return -1; // No actionable seats found
}

/**
 * Count active players (not folded, not all-in, not empty)
 */
export function countActivePlayers(seats: Seat[]): number {
  return seats.filter(isActionable).length;
}

/**
 * Count players still in hand (active or all-in, not folded)
 */
export function countPlayersInHand(seats: Seat[]): number {
  return seats.filter(seat => 
    seat.status === "active" || seat.status === "allin"
  ).length;
}

/**
 * Get first actor for a betting round
 * Handles preflop vs postflop differences and heads-up exception
 */
export function getFirstActor(table: Table, isPreflop: boolean): number {
  const { seats, button } = table;
  const activeCount = countActivePlayers(seats);
  
  if (activeCount < 2) {
    return -1; // Need at least 2 active players
  }
  
  if (isPreflop) {
    if (activeCount === 2) {
      // Heads-up preflop: button acts first
      return isActionable(seats[button]) ? button : -1;
    } else {
      // Multi-way preflop: left of big blind acts first
      const sbIndex = getNextActionableIndex(seats, button);
      const bbIndex = getNextActionableIndex(seats, sbIndex);
      return getNextActionableIndex(seats, bbIndex);
    }
  } else {
    // Postflop: left of button acts first
    return getNextActionableIndex(seats, button);
  }
}

/**
 * Determine next actor and if betting round is complete
 */
export function getNextActor(table: Table): NextActorResult {
  const { seats, actor, lastAggressor, currentBet } = table;
  
  if (actor === undefined) {
    return { isComplete: true, activeCount: 0 };
  }
  
  const activeCount = countActivePlayers(seats);
  const inHandCount = countPlayersInHand(seats);
  
  // Check if only one player remains
  if (inHandCount <= 1) {
    return { isComplete: true, activeCount };
  }
  
  // Check if everyone is all-in
  if (activeCount === 0) {
    return { isComplete: true, activeCount: 0 };
  }
  
  // Find next actionable player
  const nextIndex = getNextActionableIndex(seats, actor);
  
  if (nextIndex === -1) {
    return { isComplete: true, activeCount };
  }
  
  // Check if betting round is complete
  const isComplete = isBettingRoundComplete(table, nextIndex);
  
  return {
    actor: isComplete ? undefined : nextIndex,
    isComplete,
    activeCount
  };
}

/**
 * Check if betting round is complete based on next actor position
 */
function isBettingRoundComplete(table: Table, nextActorIndex: number): boolean {
  const { seats, lastAggressor, currentBet } = table;
  
  // If everyone has matching streetCommitted amounts or is all-in/folded
  const activePlayers = seats.filter(isActionable);
  const allMatched = activePlayers.every(seat => 
    seat.streetCommitted === currentBet || seat.status === "allin"
  );
  
  if (allMatched) {
    return true;
  }
  
  // If action would return to the last aggressor and others have called
  if (lastAggressor !== undefined && nextActorIndex === lastAggressor) {
    const otherPlayers = activePlayers.filter(seat => seat.id !== lastAggressor);
    const othersMatched = otherPlayers.every(seat => 
      seat.streetCommitted === currentBet || seat.status === "allin"
    );
    return othersMatched;
  }
  
  return false;
}

/**
 * Check if all remaining players in hand are all-in (proper detection)
 */
export function areAllPlayersAllIn(seats: Seat[]): boolean {
  const playersInHand = seats.filter(seat => 
    seat.status === "active" || seat.status === "allin"
  );
  
  // Must have at least 2 players still in hand
  if (playersInHand.length < 2) return false;
  
  // Check if ALL players in hand are all-in (no active players)
  const activePlayers = playersInHand.filter(seat => seat.status === "active");
  return activePlayers.length === 0;
}

/**
 * Calculate betting round state and completion reason
 */
export function getBettingRoundState(table: Table): BettingRoundState {
  const { seats } = table;
  const inHandCount = countPlayersInHand(seats);
  const activeCount = countActivePlayers(seats);
  
  // Check if only one player remains
  if (inHandCount <= 1) {
    return {
      isComplete: true,
      reason: "fold-to-one"
    };
  }
  
  // Check if ALL remaining players are all-in (corrected logic)
  if (areAllPlayersAllIn(seats)) {
    return {
      isComplete: true,
      reason: "all-players-allin"
    };
  }
  
  // Check normal betting completion
  const nextActor = getNextActor(table);
  
  if (nextActor.isComplete) {
    return {
      isComplete: true,
      reason: "action-complete"
    };
  }
  
  return {
    isComplete: false,
    nextActor: nextActor.actor
  };
}

/**
 * Get seat indices of all players still in the hand
 */
export function getPlayersInHand(seats: Seat[]): number[] {
  return seats
    .filter(seat => seat.status === "active" || seat.status === "allin")
    .map(seat => seat.id);
}

/**
 * Get seat indices of all active players
 */
export function getActivePlayers(seats: Seat[]): number[] {
  return seats
    .filter(isActionable)
    .map(seat => seat.id);
}

/**
 * Calculate to-call amount for a specific seat
 */
export function getToCallAmount(seat: Seat, currentBet: number): number {
  return Math.max(0, currentBet - seat.streetCommitted);
}

/**
 * Check if seat can check (no bet to call)
 */
export function canCheck(seat: Seat, currentBet: number): boolean {
  return getToCallAmount(seat, currentBet) === 0;
}

/**
 * Check if seat needs to act (has money and needs to call or can bet)
 */
export function needsToAct(seat: Seat, currentBet: number): boolean {
  if (!isActionable(seat)) {
    return false;
  }
  
  // If player needs to call
  if (getToCallAmount(seat, currentBet) > 0) {
    return true;
  }
  
  // If no bet and player can check/bet
  return currentBet === 0 || canCheck(seat, currentBet);
}

/**
 * Find the button for next hand (advance clockwise to next player with chips)
 */
export function getNextButton(table: Table): number {
  const seatsWithChips = table.seats.filter(seat => 
    seat.pid && seat.chips > 0
  );
  
  if (seatsWithChips.length === 0) {
    return table.button; // Keep current button if no players have chips
  }
  
  // Find next player with chips clockwise from current button
  for (let i = 1; i <= table.seats.length; i++) {
    const index = (table.button + i) % table.seats.length;
    const seat = table.seats[index];
    
    if (seat.pid && seat.chips > 0) {
      return index;
    }
  }
  
  return table.button; // Fallback to current button
}