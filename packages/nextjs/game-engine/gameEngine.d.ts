import { EventEmitter } from "events";
import { GameRoom, PlayerSession, Stage } from "./types";
import { GameState } from "./stateMachine";
/**
 * Central game engine orchestrating table workflow.  It wraps the low level
 * room helpers, drives the {@link PokerStateMachine} and emits events when
 * phases or table state change.
 */
export declare class GameEngine extends EventEmitter {
    private room;
    private machine;
    constructor(id: string, minBet?: number);
    /** Load an existing room snapshot */
    loadState(room: GameRoom): void;
    /** current high level engine phase */
    getPhase(): GameState;
    /** Retrieve mutable room state */
    getState(): GameRoom;
    /** Seat a new player */
    addPlayer(player: Omit<PlayerSession, "isDealer" | "isTurn" | "hand" | "hasFolded" | "currentBet" | "tableId">): PlayerSession;
    /** Remove a player from the room */
    removePlayer(playerId: string): boolean;
    /** Start a fresh hand */
    startHand(): void;
    /** Apply an action for the given player */
    handleAction(playerId: string, action: {
        type: "fold" | "call" | "raise" | "check";
        amount?: number;
    }): void;
    /** manually advance stage (used for dev controls) */
    progressStage(): void;
    /** Determine winners for the current hand */
    determineWinners(): PlayerSession[];
    /** Split the pot amongst winners */
    payout(winners: PlayerSession[]): void;
    private resolveRound;
}
export type { Stage, GameState };
