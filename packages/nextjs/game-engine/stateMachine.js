"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokerStateMachine = exports.BettingRound = exports.GameState = void 0;
var GameState;
(function (GameState) {
    GameState["WaitingForPlayers"] = "WaitingForPlayers";
    GameState["Shuffling"] = "Shuffling";
    GameState["Dealing"] = "Dealing";
    GameState["Betting"] = "Betting";
    GameState["Showdown"] = "Showdown";
    GameState["Payout"] = "Payout";
    GameState["Paused"] = "Paused";
})(GameState || (exports.GameState = GameState = {}));
var BettingRound;
(function (BettingRound) {
    BettingRound["PreFlop"] = "PreFlop";
    BettingRound["Flop"] = "Flop";
    BettingRound["Turn"] = "Turn";
    BettingRound["River"] = "River";
})(BettingRound || (exports.BettingRound = BettingRound = {}));
/**
 * PokerStateMachine models the round-based state transitions for a single table.
 * It focuses purely on state progression; networking, RNG, evaluation and I/O are pluggable.
 */
class PokerStateMachine {
    constructor() {
        this.state = GameState.WaitingForPlayers;
        this.round = null;
        this.history = [this.state];
    }
    transition(next) {
        this.state = next;
        this.history.push(next);
    }
    dispatch(event) {
        if (this.state === GameState.Paused && event.type !== "RESUME") {
            return; // ignore events while paused
        }
        switch (this.state) {
            case GameState.WaitingForPlayers:
                if (event.type === "PLAYERS_READY") {
                    this.transition(GameState.Shuffling);
                }
                break;
            case GameState.Shuffling:
                if (event.type === "SHUFFLE_COMPLETE") {
                    this.transition(GameState.Dealing);
                }
                break;
            case GameState.Dealing:
                if (event.type === "DEAL_COMPLETE") {
                    if (this.round === null) {
                        this.round = BettingRound.PreFlop;
                    }
                    else if (this.round === BettingRound.PreFlop) {
                        this.round = BettingRound.Flop;
                    }
                    else if (this.round === BettingRound.Flop) {
                        this.round = BettingRound.Turn;
                    }
                    else if (this.round === BettingRound.Turn) {
                        this.round = BettingRound.River;
                    }
                    this.transition(GameState.Betting);
                }
                break;
            case GameState.Betting:
                if (event.type === "BETTING_COMPLETE") {
                    if (event.remainingPlayers <= 1) {
                        // hand ends immediately if only one player remains
                        this.round = null;
                        this.transition(GameState.Payout);
                        break;
                    }
                    switch (this.round) {
                        case BettingRound.PreFlop:
                            this.transition(GameState.Dealing);
                            break;
                        case BettingRound.Flop:
                            this.transition(GameState.Dealing);
                            break;
                        case BettingRound.Turn:
                            this.transition(GameState.Dealing);
                            break;
                        case BettingRound.River:
                            this.transition(GameState.Showdown);
                            break;
                    }
                }
                break;
            case GameState.Showdown:
                if (event.type === "SHOWDOWN_COMPLETE") {
                    this.round = null;
                    this.transition(GameState.Payout);
                }
                break;
            case GameState.Payout:
                if (event.type === "PAYOUT_COMPLETE") {
                    this.transition(GameState.WaitingForPlayers);
                }
                break;
            case GameState.Paused:
                if (event.type === "RESUME") {
                    // resume to last non-paused state
                    const prev = this.history[this.history.length - 2] ||
                        GameState.WaitingForPlayers;
                    this.transition(prev);
                }
                break;
        }
        if (event.type === "PAUSE") {
            this.transition(GameState.Paused);
        }
    }
}
exports.PokerStateMachine = PokerStateMachine;
exports.default = PokerStateMachine;
//# sourceMappingURL=stateMachine.js.map