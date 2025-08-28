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
  PayoutDistribution 
} from './newTypes';

/**
 * Main reducer function - pure and deterministic
 * Processes events and returns new table state
 */
export function reduce(table: Table, event: PokerEvent): Table {
  switch (event.t) {
    case "StartHand":
      return startHand(table, event.handNumber, event.timestamp);
    
    case "PostBlinds":
      return postBlinds(table, event.sb, event.bb, event.ante);
    
    case "DealHole":
      return dealHoleCards(table, event.cards);
    
    case "EnterStreet":
      return enterStreet(table, event.street, event.cards);
    
    case "Action":
      return applyAction(table, event.seat, event.action, event.amount);
    
    case "TimeoutAutoFold":
      return applyAction(table, event.seat, "fold");
    
    case "CloseStreet":
      return closeStreet(table);
    
    case "Showdown":
      return processShowdown(table, event.results);
    
    case "Payout":
      return processPayout(table, event.distributions);
    
    case "HandEnd":
      return endHand(table);
    
    case "PlayerJoin":
      return addPlayer(table, event.seat, event.pid, event.chips, event.nickname);
    
    case "PlayerLeave":
      return removePlayer(table, event.seat, event.pid);
    
    default:
      // TypeScript ensures all cases are handled
      return table;
  }
}

/**
 * Initialize new hand
 */
function startHand(table: Table, handNumber: number, timestamp: number): Table {
  return {
    ...table,
    phase: "deal",
    handNumber,
    timestamp,
    street: undefined,
    actor: undefined,
    lastAggressor: undefined,
    currentBet: 0,
    pots: [],
    communityCards: [],
    // Reset all seats for new hand
    seats: table.seats.map(seat => ({
      ...seat,
      committed: 0,
      streetCommitted: 0,
      status: seat.pid ? "active" : "empty",
      holeCards: undefined
    }))
  };
}

/**
 * Post blinds and set initial betting state
 */
function postBlinds(table: Table, sb: number, bb: number, ante?: number): Table {
  const newSeats = [...table.seats];
  const activePlayers = newSeats.filter(seat => seat.status === "active");
  
  if (activePlayers.length < 2) {
    return table; // Need at least 2 players
  }
  
  // Find SB and BB positions
  const sbIndex = getNextActiveIndex(newSeats, table.button);
  const bbIndex = getNextActiveIndex(newSeats, sbIndex);
  
  // Post small blind
  if (sbIndex !== -1) {
    const sbSeat = newSeats[sbIndex];
    const sbAmount = Math.min(sb, sbSeat.chips);
    newSeats[sbIndex] = {
      ...sbSeat,
      chips: sbSeat.chips - sbAmount,
      committed: sbAmount,
      streetCommitted: sbAmount,
      status: sbSeat.chips === sbAmount ? "allin" : "active"
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
      status: bbSeat.chips === bbAmount ? "allin" : "active"
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
          streetCommitted: seat.streetCommitted + anteAmount
        };
      }
    }
  }
  
  return {
    ...table,
    phase: "preflop",
    street: "preflop",
    seats: newSeats,
    currentBet: bb,
    actor: getFirstActor(newSeats, table.button, true), // preflop = true
    blinds: { sb, bb, ante }
  };
}

/**
 * Deal hole cards to active players
 */
function dealHoleCards(table: Table, cards: Record<string, [number, number]>): Table {
  const newSeats = table.seats.map(seat => {
    if (seat.pid && cards[seat.pid]) {
      return {
        ...seat,
        holeCards: cards[seat.pid]
      };
    }
    return seat;
  });
  
  return {
    ...table,
    seats: newSeats
  };
}

/**
 * Enter new betting street
 */
function enterStreet(table: Table, street: Street, cards?: number[]): Table {
  const newSeats = table.seats.map(seat => ({
    ...seat,
    streetCommitted: 0 // Reset street commitments
  }));
  
  const communityCards = cards ? [...table.communityCards, ...cards] : table.communityCards;
  
  return {
    ...table,
    phase: street,
    street,
    seats: newSeats,
    currentBet: 0,
    lastAggressor: undefined,
    actor: getFirstActor(newSeats, table.button, false), // postflop = false
    communityCards
  };
}

/**
 * Apply player action with immutable updates
 */
function applyAction(table: Table, seatId: number, action: ActionType, amount: number = 0): Table {
  const seat = table.seats[seatId];
  if (!seat || seat.status !== "active") {
    return table; // Invalid action
  }
  
  const newSeats = [...table.seats];
  let newCurrentBet = table.currentBet;
  let newLastAggressor = table.lastAggressor;
  
  switch (action) {
    case "fold":
      newSeats[seatId] = { ...seat, status: "folded" };
      break;
      
    case "check":
      // Check only valid if no bet to call
      if (table.currentBet > seat.streetCommitted) {
        return table; // Invalid check
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
        status: seat.chips === callAmount ? "allin" : "active"
      };
      break;
      
    case "bet":
    case "raise":
      const betAmount = Math.min(amount, seat.chips);
      const newStreetCommitted = seat.streetCommitted + betAmount;
      newSeats[seatId] = {
        ...seat,
        chips: seat.chips - betAmount,
        committed: seat.committed + betAmount,
        streetCommitted: newStreetCommitted,
        status: seat.chips === betAmount ? "allin" : "active"
      };
      newCurrentBet = Math.max(newCurrentBet, newStreetCommitted);
      newLastAggressor = seatId;
      break;
      
    case "allin":
      const allInAmount = seat.chips;
      const allInStreetCommitted = seat.streetCommitted + allInAmount;
      newSeats[seatId] = {
        ...seat,
        chips: 0,
        committed: seat.committed + allInAmount,
        streetCommitted: allInStreetCommitted,
        status: "allin"
      };
      if (allInStreetCommitted > table.currentBet) {
        newCurrentBet = allInStreetCommitted;
        newLastAggressor = seatId;
      }
      break;
  }
  
  // Find next actor
  const nextActor = getNextActiveIndex(newSeats, seatId);
  
  return {
    ...table,
    seats: newSeats,
    currentBet: newCurrentBet,
    lastAggressor: newLastAggressor,
    actor: nextActor
  };
}

/**
 * Close current betting street
 */
function closeStreet(table: Table): Table {
  // Collect committed chips into pots
  const pots = collectIntoPots(table.seats);
  
  return {
    ...table,
    pots,
    actor: undefined
  };
}

/**
 * Process showdown results
 */
function processShowdown(table: Table, results: any[]): Table {
  return {
    ...table,
    phase: "showdown"
  };
}

/**
 * Process payout distributions
 */
function processPayout(table: Table, distributions: PayoutDistribution[]): Table {
  const newSeats = [...table.seats];
  
  // Distribute winnings
  distributions.forEach(dist => {
    const seatIndex = newSeats.findIndex(seat => seat.pid === dist.pid);
    if (seatIndex !== -1) {
      newSeats[seatIndex] = {
        ...newSeats[seatIndex],
        chips: newSeats[seatIndex].chips + dist.amount
      };
    }
  });
  
  return {
    ...table,
    phase: "payout",
    seats: newSeats,
    pots: [] // Clear pots after payout
  };
}

/**
 * End hand and prepare for next
 */
function endHand(table: Table): Table {
  return {
    ...table,
    phase: "lobby",
    street: undefined,
    actor: undefined,
    lastAggressor: undefined,
    currentBet: 0,
    communityCards: [],
    // Advance button
    button: getNextActiveIndex(table.seats, table.button)
  };
}

/**
 * Add player to table with proper validation
 */
function addPlayer(table: Table, seatId: number, pid: string, chips: number, nickname?: string): Table {
  // Validate seat index
  if (seatId < 0 || seatId >= table.seats.length) {
    console.error(`❌ [Reducer] Invalid seat index: ${seatId}`);
    return table; // Invalid seat
  }
  
  // Check if seat is already occupied
  if (table.seats[seatId].pid) {
    console.error(`❌ [Reducer] Seat ${seatId} is already occupied by ${table.seats[seatId].pid}`);
    return table; // Seat taken
  }
  
  // Check if player is already seated elsewhere
  const existingSeat = table.seats.find(seat => seat.pid === pid);
  if (existingSeat) {
    console.error(`❌ [Reducer] Player ${pid} is already seated at seat ${existingSeat.id}`);
    return table; // Player already seated
  }
  
  // Validate chips amount
  if (chips <= 0) {
    console.error(`❌ [Reducer] Invalid chips amount: ${chips}`);
    return table; // Invalid chips
  }
  
  const newSeats = [...table.seats];
  newSeats[seatId] = {
    id: seatId,
    pid,
    chips,
    committed: 0,
    streetCommitted: 0,
    status: "active",
    nickname
  };
  
  console.log(`✅ [Reducer] Added player ${pid} to seat ${seatId} with ${chips} chips`);
  
  return {
    ...table,
    seats: newSeats
  };
}

/**
 * Remove player from table
 */
function removePlayer(table: Table, seatId: number, pid: string): Table {
  const newSeats = [...table.seats];
  if (newSeats[seatId]?.pid === pid) {
    newSeats[seatId] = {
      id: seatId,
      chips: 0,
      committed: 0,
      streetCommitted: 0,
      status: "empty"
    };
  }
  
  return {
    ...table,
    seats: newSeats
  };
}

// Helper functions

function getNextActiveIndex(seats: Seat[], startIndex: number): number {
  const seatCount = seats.length;
  for (let i = 1; i <= seatCount; i++) {
    const index = (startIndex + i) % seatCount;
    const seat = seats[index];
    if (seat.status === "active") {
      return index;
    }
  }
  return -1; // No active seats found
}

function getFirstActor(seats: Seat[], buttonIndex: number, isPreflop: boolean): number {
  if (isPreflop) {
    // Preflop: first actor is left of BB (or button in heads-up)
    const activePlayers = seats.filter(seat => seat.status === "active");
    if (activePlayers.length === 2) {
      return buttonIndex; // Heads-up exception
    }
    
    // Multi-way: left of BB
    const sbIndex = getNextActiveIndex(seats, buttonIndex);
    const bbIndex = getNextActiveIndex(seats, sbIndex);
    return getNextActiveIndex(seats, bbIndex);
  } else {
    // Postflop: first actor is left of button
    return getNextActiveIndex(seats, buttonIndex);
  }
}

function collectIntoPots(seats: Seat[]): Pot[] {
  // Collect committed amounts by commitment level (side pot algorithm)
  const commitments = seats
    .filter(seat => seat.committed > 0)
    .map(seat => ({ pid: seat.pid!, committed: seat.committed }));
  
  if (commitments.length === 0) {
    return [];
  }
  
  // Sort by commitment level
  const levels = [...new Set(commitments.map(c => c.committed))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prevLevel = 0;
  
  for (const level of levels) {
    const layerWidth = level - prevLevel;
    const contributors = commitments.filter(c => c.committed >= level);
    const potAmount = layerWidth * contributors.length;
    
    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePids: contributors.map(c => c.pid),
        cap: level
      });
    }
    
    prevLevel = level;
  }
  
  return pots;
}