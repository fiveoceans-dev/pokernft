import { Table } from "./types";
/** Count active players at the table */
export declare function countActivePlayers(table: Table): number;
/** True when exactly two players remain active */
export declare function isHeadsUp(table: Table): boolean;
