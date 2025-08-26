import { Player, PlayerAction, Table, Round } from "./types";
/** Handlers invoked when timers resolve to auto actions */
export interface TimerHandlers {
    onAutoAction: (playerId: string, action: PlayerAction) => void;
}
/**
 * TimerService manages per‑action timers, optional timebank consumption,
 * disconnect grace periods and animation delays between game events.
 */
export declare class TimerService {
    private table;
    private handlers;
    private disconnectGraceMs;
    private turnTimer?;
    private disconnectTimers;
    constructor(table: Table, handlers: TimerHandlers, disconnectGraceMs?: number);
    /** Clear any active action timer */
    private clearTurnTimer;
    /** Begin countdown for the given player's action */
    startActionTimer(player: Player): void;
    /** Handle player disconnection with a grace timer */
    handleDisconnect(player: Player): void;
    /** Clear disconnect timer on reconnection */
    handleReconnect(playerId: string): void;
    private clearDisconnectTimer;
    /** Utility: wait for a number of milliseconds */
    static wait(ms: number): Promise<void>;
    /** Deal hole cards with animation delays */
    dealHoleAnimated(table: Table): Promise<void>;
    /** Deal board cards with animation delays */
    dealBoardAnimated(table: Table, round: Round): Promise<void>;
    /** Pause between hands after payouts */
    interRoundPause(): Promise<void>;
}
export default TimerService;
