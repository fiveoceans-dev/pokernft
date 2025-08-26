import { Table, Round } from "./types";
/** Deal two hole cards to each active seat starting from the small blind */
export declare function dealHole(table: Table): void;
/** Deal board cards for the given round */
export declare function dealBoard(table: Table, round: Round, burn?: boolean): void;
