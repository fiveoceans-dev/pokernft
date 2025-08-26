import { Table, PlayerState } from "./types";

/** Count active players at the table */
export function countActivePlayers(table: Table): number {
  return table.seats.filter((p) => p && p.state === PlayerState.ACTIVE).length;
}

/** True when exactly two players remain active */
export function isHeadsUp(table: Table): boolean {
  return countActivePlayers(table) === 2;
}
