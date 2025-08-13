import { Table, PlayerState, Round } from './types';
import { draw } from './utils';

/** Deal two hole cards to each active seat starting from the small blind */
export function dealHoleCards(table: Table) {
  if (!table.deck.length) return;
  const len = table.seats.length;
  // deal one card at a time, starting from small blind
  for (let i = 0; i < 2; i++) {
    for (let offset = 0; offset < len; offset++) {
      const idx = (table.smallBlindIndex + offset) % len;
      const player = table.seats[idx];
      if (player && player.state !== PlayerState.SITTING_OUT) {
        player.holeCards.push(draw(table.deck));
      }
    }
  }
}

/** Deal board cards for the given round with optional burn */
export function dealBoard(table: Table, round: Round) {
  if (!table.deck.length) return;
  // burn card
  draw(table.deck);
  if (round === Round.FLOP) {
    table.board.push(draw(table.deck), draw(table.deck), draw(table.deck));
  } else if (round === Round.TURN || round === Round.RIVER) {
    table.board.push(draw(table.deck));
  }
}
