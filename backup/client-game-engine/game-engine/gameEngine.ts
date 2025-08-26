import { EventEmitter } from "events";
import { GameRoom, PlayerSession, Stage } from "./types";
import {
  createRoom as createRoomImpl,
  addPlayer as addPlayerImpl,
  startRoomHand as startHandImpl,
  handleAction as handleActionImpl,
  progressStage as progressStageImpl,
  determineWinners as determineWinnersImpl,
  isRoomRoundComplete as isRoundCompleteImpl,
  payout as payoutImpl,
} from "./room";
import { PokerStateMachine, GameState } from "./stateMachine";

/**
 * Central game engine orchestrating table workflow.  It wraps the low level
 * room helpers, drives the {@link PokerStateMachine} and emits events when
 * phases or table state change.
 */
export class GameEngine extends EventEmitter {
  private room: GameRoom;
  private machine: PokerStateMachine;

  constructor(id: string, minBet = 10) {
    super();
    this.room = createRoomImpl(id, minBet);
    this.machine = new PokerStateMachine();
  }

  /** Load an existing room snapshot */
  loadState(room: GameRoom): void {
    this.room = room;
  }

  /** current high level engine phase */
  getPhase(): GameState {
    return this.machine.state;
  }

  /** Retrieve mutable room state */
  getState(): GameRoom {
    return this.room;
  }

  /** Seat a new player */
  addPlayer(
    player: Omit<
      PlayerSession,
      "isDealer" | "isTurn" | "hand" | "hasFolded" | "currentBet" | "tableId"
    >,
  ): PlayerSession {
    return addPlayerImpl(this.room, player);
  }

  /** Remove a player from the room */
  removePlayer(playerId: string): boolean {
    const idx = this.room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return false;
    this.room.players.splice(idx, 1);
    this.emit("stateChanged", this.room);
    return true;
  }

  /** Start a fresh hand */
  startHand() {
    this.machine.dispatch({ type: "PLAYERS_READY" });
    this.machine.dispatch({ type: "SHUFFLE_COMPLETE" });
    startHandImpl(this.room);
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
  handleAction(
    playerId: string,
    action: { type: "fold" | "call" | "raise" | "check"; amount?: number },
  ) {
    handleActionImpl(this.room, playerId, action);
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
    
    if (isRoundCompleteImpl(this.room)) {
      this.resolveRound();
    }
  }

  /** manually advance stage (used for dev controls) */
  progressStage() {
    progressStageImpl(this.room);
    this.machine.dispatch({ type: "DEAL_COMPLETE" });
    this.emit("phaseChanged", this.machine.state);
    this.emit("stageChanged", this.room.stage);
    this.emit("stateChanged", this.room);
  }

  /** Determine winners for the current hand */
  determineWinners(): PlayerSession[] {
    return determineWinnersImpl(this.room);
  }

  /** Split the pot amongst winners */
  payout(winners: PlayerSession[]) {
    payoutImpl(this.room, winners);
  }

  private resolveRound() {
    const remaining = this.room.players.filter((p) => !p.hasFolded).length;
    this.machine.dispatch({
      type: "BETTING_COMPLETE",
      remainingPlayers: remaining,
    });

    if (remaining <= 1) {
      const winners = this.room.players.filter((p) => !p.hasFolded);
      payoutImpl(this.room, winners);
      this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
      this.room.stage = "waiting";
      this.emit("phaseChanged", this.machine.state);
      this.emit("handEnded", winners);
      this.emit("stateChanged", this.room);
      return;
    }

    if (this.room.stage === "river") {
      progressStageImpl(this.room); // advance to showdown
      const winners = determineWinnersImpl(this.room);
      this.machine.dispatch({ type: "SHOWDOWN_COMPLETE" });
      payoutImpl(this.room, winners);
      this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
      this.room.players.forEach((p) => (p.isTurn = false));
      this.emit("phaseChanged", this.machine.state);
      this.emit("stageChanged", this.room.stage);
      this.emit("handEnded", winners);
      this.emit("stateChanged", this.room);
      return;
    }

    progressStageImpl(this.room);
    this.machine.dispatch({ type: "DEAL_COMPLETE" });
    this.emit("phaseChanged", this.machine.state);
    this.emit("stageChanged", this.room.stage);
    this.emit("stateChanged", this.room);
  }
}

export type { Stage, GameState };
