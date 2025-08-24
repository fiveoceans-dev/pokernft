import { Table, PlayerState, Round } from "./types";
import { draw } from "./utils";

/** Deal two hole cards to each active seat starting from the small blind */
export function dealHole(table: Table) {
  if (!table.deck.length) return;
  const len = table.seats.length;
  // deal one card at a time, starting from small blind
  for (let i = 0; i < 2; i++) {
    for (let offset = 0; offset < len; offset++) {
      const idx = (table.smallBlindIndex + offset) % len;
      const player = table.seats[idx];
      if (player && player.state === PlayerState.ACTIVE) {
        player.holeCards.push(draw(table.deck));
      }
    }
  }
}

/** Deal board cards for the given round */
export function dealBoard(table: Table, round: Round, burn = true) {
  if (!table.deck.length) return;
  // optional burn card
  if (burn) draw(table.deck);
  if (round === Round.FLOP) {
    table.board.push(draw(table.deck), draw(table.deck), draw(table.deck));
  } else if (round === Round.TURN || round === Round.RIVER) {
    table.board.push(draw(table.deck));
  }
}
