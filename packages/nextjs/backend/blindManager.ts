import { GameRoom } from './types';

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
