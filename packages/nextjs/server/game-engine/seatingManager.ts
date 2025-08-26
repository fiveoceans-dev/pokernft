import { Table, Player, PlayerState, PlayerAction, TableState } from "./types";

/**
 * SeatingManager handles seat assignment, buy-ins, sit-out/return and leaving.
 * It also removes players with zero stacks or marks them sitting out when
 * re-buy is permitted.
 */
export class SeatingManager {
  constructor(private table: Table) {}

  /** Seat a new player at the given index. Returns the created player or null. */
  seatPlayer(seatIndex: number, id: string, stack: number): Player | null {
    if (seatIndex < 0 || seatIndex >= this.table.seats.length) return null;
    if (this.table.seats[seatIndex]) return null;
    // prevent same player id from taking multiple seats at the table
    if (this.table.seats.some((p) => p?.id === id)) return null;

    if (stack < this.table.minBuyIn || stack > this.table.maxBuyIn) return null;
    const player: Player = {
      id,
      seatIndex,
      stack,
      state: PlayerState.SEATED,
      hasButton: false,
      autoPostBlinds: true,
      timebankMs: 0,
      betThisRound: 0,
      totalCommitted: 0,
      holeCards: [],
      lastAction: PlayerAction.NONE,
    };
    this.table.seats[seatIndex] = player;
    return player;
  }

  /** Increase a player's stack up to the table's max buy-in. */
  topUp(seatIndex: number, amount: number): boolean {
    const player = this.table.seats[seatIndex];
    if (!player || amount <= 0) return false;
    const maxAdd = this.table.maxBuyIn - player.stack;
    if (amount > maxAdd) return false;
    player.stack += amount;
    return true;
  }

  /**
   * Mark a player as sitting out. When {@link remove} is true the seat is
   * vacated immediately.
   */
  sitOut(seatIndex: number, remove = false) {
    const player = this.table.seats[seatIndex];
    if (!player) return;
    if (remove) {
      this.table.seats[seatIndex] = null;
      return;
    }
    if (this.table.state === TableState.WAITING) {
      player.state = PlayerState.SITTING_OUT;
    } else {
      player.sitOutNextHand = true;
    }
  }

  /** Return a sitting out player to active play if they have chips. */
  sitIn(seatIndex: number) {
    const player = this.table.seats[seatIndex];
    if (!player) return;
    player.sitOutNextHand = false;
    if (player.stack >= this.table.bigBlindAmount) {
      player.state = PlayerState.ACTIVE;
    }
  }

  /** Remove a player entirely from the table. */
  leave(seatIndex: number) {
    const player = this.table.seats[seatIndex];
    if (!player) return;
    if (this.table.state === TableState.WAITING) {
      this.table.seats[seatIndex] = null;
    } else {
      player.state = PlayerState.LEAVING;
    }
  }

  /** Remove or mark players with zero chips depending on re-buy rules. */
  removeBrokePlayers(reBuyAllowed: boolean) {
    this.table.seats.forEach((p) => {
      if (!p) return;
      if (p.stack === 0) {
        if (reBuyAllowed) {
          p.state = PlayerState.SITTING_OUT;
        } else {
          p.state = PlayerState.LEAVING;
        }
      }
    });
  }
}

export default SeatingManager;
