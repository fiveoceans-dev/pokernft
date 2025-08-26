export declare enum GameState {
    WaitingForPlayers = "WaitingForPlayers",
    Shuffling = "Shuffling",
    Dealing = "Dealing",
    Betting = "Betting",
    Showdown = "Showdown",
    Payout = "Payout",
    Paused = "Paused"
}
export declare enum BettingRound {
    PreFlop = "PreFlop",
    Flop = "Flop",
    Turn = "Turn",
    River = "River"
}
export type Event = {
    type: "PLAYERS_READY";
} | {
    type: "SHUFFLE_COMPLETE";
} | {
    type: "DEAL_COMPLETE";
} | {
    type: "BETTING_COMPLETE";
    remainingPlayers: number;
} | {
    type: "SHOWDOWN_COMPLETE";
} | {
    type: "PAYOUT_COMPLETE";
} | {
    type: "PAUSE";
    reason: string;
} | {
    type: "RESUME";
};
/**
 * PokerStateMachine models the round-based state transitions for a single table.
 * It focuses purely on state progression; networking, RNG, evaluation and I/O are pluggable.
 */
export declare class PokerStateMachine {
    state: GameState;
    round: BettingRound | null;
    history: GameState[];
    private transition;
    dispatch(event: Event): void;
}
export default PokerStateMachine;
