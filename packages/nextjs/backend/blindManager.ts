import { GameRoom, Table, Player, PlayerState, PlayerAction } from "./types";
import { recomputePots } from "./potManager";
import { countActivePlayers, isHeadsUp } from "./tableUtils";

/**
 * BlindManager computes small/big blind positions and posts the blinds.
 * It assumes `room.minBet` represents the big blind and deducts the
 * corresponding amounts from each player.
 */
export class BlindManager {
  constructor(
    private smallBlind: number,
    private bigBlind: number,
  ) {}

  /** Return the indices for small and big blinds */
  getBlindIndices(room: GameRoom): { sb: number; bb: number } {
    const sb = this.nextActiveIndex(room, room.dealerIndex + 1);
    const bb = this.nextActiveIndex(room, sb + 1);
    return { sb, bb };
  }

  /** Post blinds to the pot and update player bets */
  postBlinds(room: GameRoom): { sb: number; bb: number } {
    const { sb, bb } = this.getBlindIndices(room);
    const sbPlayer = room.players[sb];
    const bbPlayer = room.players[bb];

    const sbAmt = Math.min(this.smallBlind, sbPlayer.chips);
    const bbAmt = Math.min(this.bigBlind, bbPlayer.chips);

    sbPlayer.chips -= sbAmt;
    sbPlayer.currentBet = sbAmt;
    bbPlayer.chips -= bbAmt;
    bbPlayer.currentBet = bbAmt;
    room.pot += sbAmt + bbAmt;

    return { sb, bb };
  }

  /** Find the next active player index starting from `start` */
  nextActiveIndex(room: GameRoom, start: number): number {
    let idx = start % room.players.length;
    while (room.players[idx].hasFolded) {
      idx = (idx + 1) % room.players.length;
    }
    return idx;
  }
}

/**
 * Assign button, small blind and big blind for a {@link Table} and attempt to
 * post the blinds according to player stacks. Returns `true` when both blinds
 * were posted successfully, otherwise `false` indicating the hand cannot
 * start.
 */
export function assignBlindsAndButton(table: Table): boolean {
  const activeSeat = (start: number): number | null => {
    const len = table.seats.length;
    for (let i = 0; i < len; i++) {
      const idx = (start + i) % len;
      const p = table.seats[idx];
      if (p && p.state === PlayerState.ACTIVE) return idx;
    }
    return null;
  };

  const postBlind = (player: Player, amount: number): boolean => {
    if (player.stack >= amount) {
      player.stack -= amount;
      player.betThisRound = amount;
      player.totalCommitted += amount;
      player.lastAction = PlayerAction.BET;
      return true;
    }
    if (player.stack > 0) {
      player.betThisRound = player.stack;
      player.totalCommitted += player.stack;
      player.stack = 0;
      player.state = PlayerState.ALL_IN;
      player.lastAction = PlayerAction.ALL_IN;
      return true;
    }
    return false;
  };

  if (countActivePlayers(table) < 2) return false;

  const btn = activeSeat(table.buttonIndex + 1);
  if (btn === null) return false;
  table.buttonIndex = btn;
  table.seats.forEach((p, i) => {
    if (p) p.hasButton = i === btn;
  });

  let sb: number | null;
  let bb: number | null;

  const computeBlinds = () => {
    if (isHeadsUp(table)) {
      sb = btn;
      bb = activeSeat(btn + 1);
    } else {
      sb = activeSeat(btn + 1);
      bb = sb !== null ? activeSeat(sb + 1) : null;
    }
  };

  computeBlinds();

  while (sb !== null && bb !== null) {
    const sbPlayer = table.seats[sb]!;
    const bbPlayer = table.seats[bb]!;
    const sbPosted = postBlind(sbPlayer, table.smallBlindAmount);
    const bbPosted = postBlind(bbPlayer, table.bigBlindAmount);

    if (sbPosted && bbPosted) break;

    if (!sbPosted) sbPlayer.state = PlayerState.SITTING_OUT;
    if (!bbPosted) bbPlayer.state = PlayerState.SITTING_OUT;

    const remaining = countActivePlayers(table);
    if (remaining < 2) return false;

    computeBlinds();
    if (sb === null || bb === null) return false;
  }

  if (sb === null || bb === null) return false;

  table.smallBlindIndex = sb;
  table.bigBlindIndex = bb;
  table.betToCall = table.bigBlindAmount;

  if (isHeadsUp(table)) {
    table.actingIndex = sb;
  } else {
    const first = activeSeat(bb + 1);
    table.actingIndex = first ?? sb;
  }

  // recompute pots if any blind went all-in
  if (
    table.seats[sb]?.state === PlayerState.ALL_IN ||
    table.seats[bb]?.state === PlayerState.ALL_IN
  ) {
    recomputePots(table);
  }

  return true;
}
