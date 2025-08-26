"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const events_1 = require("events");
const room_1 = require("./room");
const stateMachine_1 = require("./stateMachine");
/**
 * Central game engine orchestrating table workflow.  It wraps the low level
 * room helpers, drives the {@link PokerStateMachine} and emits events when
 * phases or table state change.
 */
class GameEngine extends events_1.EventEmitter {
    constructor(id, minBet = 10) {
        super();
        this.room = (0, room_1.createRoom)(id, minBet);
        this.machine = new stateMachine_1.PokerStateMachine();
    }
    /** Load an existing room snapshot */
    loadState(room) {
        this.room = room;
    }
    /** current high level engine phase */
    getPhase() {
        return this.machine.state;
    }
    /** Retrieve mutable room state */
    getState() {
        return this.room;
    }
    /** Seat a new player */
    addPlayer(player) {
        return (0, room_1.addPlayer)(this.room, player);
    }
    /** Remove a player from the room */
    removePlayer(playerId) {
        const idx = this.room.players.findIndex((p) => p.id === playerId);
        if (idx === -1)
            return false;
        this.room.players.splice(idx, 1);
        this.emit("stateChanged", this.room);
        return true;
    }
    /** Start a fresh hand */
    startHand() {
        this.machine.dispatch({ type: "PLAYERS_READY" });
        this.machine.dispatch({ type: "SHUFFLE_COMPLETE" });
        (0, room_1.startRoomHand)(this.room);
        this.machine.dispatch({ type: "DEAL_COMPLETE" });
        this.emit("stateChanged", this.room);
        this.emit("phaseChanged", this.machine.state);
        this.emit("handStarted", this.room);
        // Emit turn event for first player to act
        const currentPlayer = this.room.players[this.room.currentTurnIndex];
        if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting") {
            const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
            const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
            this.emit("turnChanged", {
                playerId: currentPlayer.id,
                actingIndex: this.room.currentTurnIndex,
                betToCall,
                minRaise: this.room.minBet,
                timeLeftMs: 0
            });
        }
    }
    /** Apply an action for the given player */
    handleAction(playerId, action) {
        (0, room_1.handleAction)(this.room, playerId, action);
        this.emit("stateChanged", this.room);
        // Emit turn changed event if there's an active player
        const currentPlayer = this.room.players[this.room.currentTurnIndex];
        if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting" && this.room.stage !== "showdown") {
            const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
            const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
            this.emit("turnChanged", {
                playerId: currentPlayer.id,
                actingIndex: this.room.currentTurnIndex,
                betToCall,
                minRaise: this.room.minBet,
                timeLeftMs: 0
            });
        }
        if ((0, room_1.isRoomRoundComplete)(this.room)) {
            this.resolveRound();
        }
    }
    /** manually advance stage (used for dev controls) */
    progressStage() {
        (0, room_1.progressStage)(this.room);
        this.machine.dispatch({ type: "DEAL_COMPLETE" });
        this.emit("phaseChanged", this.machine.state);
        this.emit("stageChanged", this.room.stage);
        this.emit("stateChanged", this.room);
    }
    /** Determine winners for the current hand */
    determineWinners() {
        return (0, room_1.determineWinners)(this.room);
    }
    /** Split the pot amongst winners */
    payout(winners) {
        (0, room_1.payout)(this.room, winners);
    }
    resolveRound() {
        const remaining = this.room.players.filter((p) => !p.hasFolded).length;
        this.machine.dispatch({
            type: "BETTING_COMPLETE",
            remainingPlayers: remaining,
        });
        if (remaining <= 1) {
            const winners = this.room.players.filter((p) => !p.hasFolded);
            (0, room_1.payout)(this.room, winners);
            this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
            this.room.stage = "waiting";
            this.emit("phaseChanged", this.machine.state);
            this.emit("handEnded", winners);
            this.emit("stateChanged", this.room);
            return;
        }
        if (this.room.stage === "river") {
            (0, room_1.progressStage)(this.room); // advance to showdown
            const winners = (0, room_1.determineWinners)(this.room);
            this.machine.dispatch({ type: "SHOWDOWN_COMPLETE" });
            (0, room_1.payout)(this.room, winners);
            this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
            this.room.players.forEach((p) => (p.isTurn = false));
            this.emit("phaseChanged", this.machine.state);
            this.emit("stageChanged", this.room.stage);
            this.emit("handEnded", winners);
            this.emit("stateChanged", this.room);
            return;
        }
        (0, room_1.progressStage)(this.room);
        this.machine.dispatch({ type: "DEAL_COMPLETE" });
        this.emit("phaseChanged", this.machine.state);
        this.emit("stageChanged", this.room.stage);
        this.emit("stateChanged", this.room);
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=gameEngine.js.map