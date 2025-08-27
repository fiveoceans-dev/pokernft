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
  private showdownTimer: NodeJS.Timeout | null = null;

  constructor(id: string, minBet = 10) {
    super();
    console.log(`🎮 [GameEngine] Creating new game engine for table ${id} with minBet $${minBet}`);
    this.room = createRoomImpl(id, minBet);
    this.machine = new PokerStateMachine();
    console.log(`✅ [GameEngine] Game engine created successfully for table ${id}`);
  }

  /** Load an existing room snapshot */
  loadState(room: GameRoom): void {
    console.log(`📂 [GameEngine] Loading room state for ${room.id} with ${room.players.length} players`);
    this.room = room;
    console.log(`✅ [GameEngine] Room state loaded successfully, stage: ${this.room.stage}`);
    this.emit("stateChanged", this.room);
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
    console.log(`🪑 [GameEngine] Adding player ${player.id} (${player.nickname}) to seat ${player.seat} with ${player.chips} chips`);
    
    // Validate seat availability - GameEngine is now single source of truth
    if (player.seat < 0 || player.seat >= 9) {
      console.log(`❌ [GameEngine] Invalid seat ${player.seat} - must be 0-8`);
      throw new Error(`Invalid seat ${player.seat} - must be 0-8`);
    }
    
    // Check if player already exists at this table
    const existingPlayer = this.room.players.find(p => p.id === player.id);
    if (existingPlayer) {
      console.log(`❌ [GameEngine] Player ${player.id} already seated at table ${this.room.id}`);
      throw new Error(`Player ${player.id} already seated at this table`);
    }
    
    // Check if seat is already taken
    const seatTaken = this.room.players.find(p => p.seat === player.seat);
    if (seatTaken) {
      console.log(`❌ [GameEngine] Seat ${player.seat} already taken by player ${seatTaken.id}`);
      throw new Error(`Seat ${player.seat} already taken`);
    }
    
    const result = addPlayerImpl(this.room, player);
    console.log(`✅ [GameEngine] Player added successfully. Table now has ${this.room.players.length} players`);
    this.emit("stateChanged", this.room);
    return result;
  }

  /** Remove a player from the room */
  removePlayer(playerId: string): boolean {
    console.log(`👋 [GameEngine] Removing player ${playerId} from table ${this.room.id}`);
    const idx = this.room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) {
      console.log(`❌ [GameEngine] Player ${playerId} not found in table ${this.room.id}`);
      return false;
    }
    
    const removedPlayer = this.room.players[idx];
    console.log(`🗑️ [GameEngine] Removing player from index ${idx} (seat ${removedPlayer.seat})`);
    
    // Remove the player
    this.room.players.splice(idx, 1);
    
    // Adjust indices if they're pointing to players after the removed one
    if (this.room.dealerIndex > idx) {
      this.room.dealerIndex--;
      console.log(`🔄 [GameEngine] Adjusted dealerIndex to ${this.room.dealerIndex}`);
    } else if (this.room.dealerIndex === idx && this.room.players.length > 0) {
      // If the dealer was removed, move dealer to next player
      this.room.dealerIndex = this.room.dealerIndex % this.room.players.length;
      console.log(`🔄 [GameEngine] Dealer was removed, new dealerIndex: ${this.room.dealerIndex}`);
    }
    
    if (this.room.currentTurnIndex > idx) {
      this.room.currentTurnIndex--;
      console.log(`🔄 [GameEngine] Adjusted currentTurnIndex to ${this.room.currentTurnIndex}`);
    } else if (this.room.currentTurnIndex === idx && this.room.players.length > 0) {
      // If it was the current player's turn, move to next player
      this.room.currentTurnIndex = this.room.currentTurnIndex % this.room.players.length;
      console.log(`🔄 [GameEngine] Current turn player was removed, new currentTurnIndex: ${this.room.currentTurnIndex}`);
    }
    
    console.log(`✅ [GameEngine] Player removed. Table now has ${this.room.players.length} players`);
    this.emit("stateChanged", this.room);
    return true;
  }

  /** Start a fresh hand */
  startHand() {
    console.log(`🎯 [GameEngine] Starting new hand for table ${this.room.id} with ${this.room.players.length} players`);
    
    // Clear any existing showdown timer when starting a new hand
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
      console.log(`🔄 [GameEngine] Cleared existing showdown timer`);
    }
    
    this.machine.dispatch({ type: "PLAYERS_READY" });
    this.machine.dispatch({ type: "SHUFFLE_COMPLETE" });
    startHandImpl(this.room);
    this.machine.dispatch({ type: "DEAL_COMPLETE" });
    console.log(`✅ [GameEngine] Hand started successfully, stage: ${this.room.stage}, pot: $${this.room.pot}`);
    this.emit("stateChanged", this.room);
    this.emit("phaseChanged", this.machine.state);
    this.emit("handStarted", this.room);
    
    // Emit turn event for first player to act
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting") {
      const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
      const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
      console.log(`🎮 [GameEngine] Emitting turnChanged for ${currentPlayer.id} at seat ${currentPlayer.seat} (array index ${this.room.currentTurnIndex})`);
      this.emit("turnChanged", {
        playerId: currentPlayer.id,
        playerArrayIndex: this.room.currentTurnIndex, // for server internal use
        actingIndex: currentPlayer.seat, // this is the SEAT INDEX (0-8) that client expects
        betToCall,
        minRaise: Math.max(this.room.minBet, maxBet + this.room.minBet),
        timeLeftMs: 10000 // 10 second timer
      });
    }
  }

  /** Apply an action for the given player */
  handleAction(
    playerId: string,
    action: { type: "fold" | "call" | "raise" | "check"; amount?: number },
  ) {
    console.log(`🎮 [GameEngine] Player ${playerId} action: ${action.type}${action.amount ? ` $${action.amount}` : ''}`);
    handleActionImpl(this.room, playerId, action);
    this.emit("stateChanged", this.room);
    
    // Check for single winner scenario first (this happens in handleActionImpl)
    const activePlayersAfterAction = this.room.players.filter(p => !p.hasFolded);
    if (activePlayersAfterAction.length === 1 && this.room.stage === "waiting") {
      console.log(`🏆 [GameEngine] Single winner scenario detected after ${action.type}`);
      this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
      this.emit("phaseChanged", this.machine.state);
      this.emit("handEnded", activePlayersAfterAction);
      this.emit("stateChanged", this.room);
      
      // If we still have 2+ players with chips, signal that a new hand can start
      const playersWithChips = this.room.players.filter((p) => p.chips > 0);
      if (playersWithChips.length >= 2) {
        console.log(`🔄 [GameEngine] Ready for new hand with ${playersWithChips.length} players`);
        this.emit("readyForNewHand");
      }
      return;
    }
    
    // Check if round is complete before emitting turn events
    if (isRoundCompleteImpl(this.room)) {
      this.resolveRound();
      return;
    }
    
    // Emit turn changed event for the next player to act
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting" && this.room.stage !== "showdown") {
      const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
      const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
      console.log(`🎮 [GameEngine] Turn advanced to ${currentPlayer.id} at seat ${currentPlayer.seat} (array index ${this.room.currentTurnIndex})`);
      this.emit("turnChanged", {
        playerId: currentPlayer.id,
        playerArrayIndex: this.room.currentTurnIndex, // for server internal use
        actingIndex: currentPlayer.seat, // this is the SEAT INDEX (0-8) that client expects
        betToCall,
        minRaise: Math.max(this.room.minBet, maxBet + this.room.minBet),
        timeLeftMs: 10000 // 10 second timer
      });
    }
  }

  /** manually advance stage (used for dev controls) */
  progressStage() {
    const prevStage = this.room.stage;
    console.log(`⏭️ [GameEngine] Manually advancing stage from ${prevStage} for table ${this.room.id}`);
    progressStageImpl(this.room);
    this.machine.dispatch({ type: "DEAL_COMPLETE" });
    console.log(`✅ [GameEngine] Stage advanced from ${prevStage} to ${this.room.stage}`);
    this.emit("phaseChanged", this.machine.state);
    this.emit("stageChanged", this.room.stage);
    this.emit("stateChanged", this.room);
    
    // Emit turn changed event for first player to act in new betting round
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting" && this.room.stage !== "showdown") {
      const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
      const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
      console.log(`🎮 [GameEngine] Manual stage progression to ${this.room.stage}, turn to ${currentPlayer.id} at seat ${currentPlayer.seat}`);
      this.emit("turnChanged", {
        playerId: currentPlayer.id,
        playerArrayIndex: this.room.currentTurnIndex, // for server internal use
        actingIndex: currentPlayer.seat, // this is the SEAT INDEX (0-8) that client expects
        betToCall,
        minRaise: Math.max(this.room.minBet, maxBet + this.room.minBet),
        timeLeftMs: 10000 // 10 second timer
      });
    }
  }

  /** Determine winners for the current hand */
  determineWinners(): PlayerSession[] {
    return determineWinnersImpl(this.room);
  }

  /** Split the pot amongst winners */
  payout(winners: PlayerSession[]) {
    const potAmount = this.room.pot;
    console.log(`💰 [GameEngine] Paying out $${potAmount} to ${winners.length} winner(s): ${winners.map(w => w.id).join(', ')}`);
    
    // Create winner announcement message
    let winnerMessage = "";
    if (winners.length === 1) {
      const share = Math.floor(potAmount / winners.length);
      winnerMessage = `${winners[0].id.slice(0, 6)}...${winners[0].id.slice(-4)} wins $${share}`;
    } else {
      const share = Math.floor(potAmount / winners.length);
      const winnerNames = winners.map(w => `${w.id.slice(0, 6)}...${w.id.slice(-4)}`).join(', ');
      winnerMessage = `${winnerNames} split the pot ($${share} each)`;
    }
    
    payoutImpl(this.room, winners);
    console.log(`✅ [GameEngine] Payout completed`);
    
    // Emit dealer message after payout
    this.emit("dealerMessage", winnerMessage);
    this.emit("stateChanged", this.room);
  }

  private resolveRound() {
    const remaining = this.room.players.filter((p) => !p.hasFolded).length;
    this.machine.dispatch({
      type: "BETTING_COMPLETE",
      remainingPlayers: remaining,
    });

    if (remaining <= 1) {
      const winners = this.room.players.filter((p) => !p.hasFolded);
      const potAmount = this.room.pot;
      
      // Create winner announcement message
      let winnerMessage = "";
      if (winners.length === 1) {
        winnerMessage = `${winners[0].id.slice(0, 6)}...${winners[0].id.slice(-4)} wins $${potAmount} (others folded)`;
      }
      
      payoutImpl(this.room, winners);
      this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
      this.room.stage = "waiting";
      // Reset all player turn states
      this.room.players.forEach((p) => (p.isTurn = false));
      this.emit("phaseChanged", this.machine.state);
      this.emit("handEnded", winners);
      
      // Emit dealer message after payout
      if (winnerMessage) {
        this.emit("dealerMessage", winnerMessage);
      }
      this.emit("stateChanged", this.room);
      
      // If we still have 2+ players with chips, signal that a new hand can start
      const playersWithChips = this.room.players.filter((p) => p.chips > 0);
      if (playersWithChips.length >= 2) {
        this.emit("readyForNewHand");
      }
      return;
    }

    if (this.room.stage === "river") {
      progressStageImpl(this.room); // advance to showdown
      const winners = determineWinnersImpl(this.room);
      const potAmount = this.room.pot;
      
      console.log(`🃏 [GameEngine] Showdown - ${winners.length} winner(s), pot: $${potAmount}`);
      
      // Emit stage change to showdown so clients can reveal cards
      this.emit("phaseChanged", this.machine.state);
      this.emit("stageChanged", this.room.stage);
      this.emit("stateChanged", this.room);
      
      // Emit showdown event with winner info for client display
      this.emit("showdownStarted", { winners: winners.map(w => w.id), potAmount });
      
      // Set timer to complete showdown after 4 seconds (enough time to see cards)
      if (this.showdownTimer) {
        clearTimeout(this.showdownTimer);
      }
      
      this.showdownTimer = setTimeout(() => {
        this.completeShowdown(winners, potAmount);
      }, 4000);
      
      return;
    }

    progressStageImpl(this.room);
    this.machine.dispatch({ type: "DEAL_COMPLETE" });
    this.emit("phaseChanged", this.machine.state);
    this.emit("stageChanged", this.room.stage);
    this.emit("stateChanged", this.room);
    
    // Emit turn changed event for first player to act in new betting round
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    if (currentPlayer && currentPlayer.isTurn && this.room.stage !== "waiting" && this.room.stage !== "showdown") {
      const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
      const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
      console.log(`🎮 [GameEngine] Round resolved, progressed to ${this.room.stage}, turn to ${currentPlayer.id} at seat ${currentPlayer.seat}`);
      this.emit("turnChanged", {
        playerId: currentPlayer.id,
        playerArrayIndex: this.room.currentTurnIndex, // for server internal use
        actingIndex: currentPlayer.seat, // this is the SEAT INDEX (0-8) that client expects
        betToCall,
        minRaise: Math.max(this.room.minBet, maxBet + this.room.minBet),
        timeLeftMs: 10000 // 10 second timer
      });
    }
  }

  /** Complete the showdown after timer expires */
  private completeShowdown(winners: PlayerSession[], potAmount: number) {
    console.log(`✅ [GameEngine] Completing showdown for ${winners.length} winner(s)`);
    
    // Create winner announcement message
    let winnerMessage = "";
    if (winners.length === 1) {
      const share = Math.floor(potAmount / winners.length);
      winnerMessage = `${winners[0].id.slice(0, 6)}...${winners[0].id.slice(-4)} wins $${share} at showdown`;
    } else {
      const share = Math.floor(potAmount / winners.length);
      const winnerNames = winners.map(w => `${w.id.slice(0, 6)}...${w.id.slice(-4)}`).join(', ');
      winnerMessage = `${winnerNames} split the pot at showdown ($${share} each)`;
    }
    
    // Complete the showdown process
    this.machine.dispatch({ type: "SHOWDOWN_COMPLETE" });
    payoutImpl(this.room, winners);
    this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
    this.room.players.forEach((p) => (p.isTurn = false));
    this.room.stage = "waiting";
    
    // Clear the timer
    this.showdownTimer = null;
    
    // Emit events
    this.emit("phaseChanged", this.machine.state);
    this.emit("stageChanged", this.room.stage);
    this.emit("handEnded", winners);
    this.emit("dealerMessage", winnerMessage);
    this.emit("stateChanged", this.room);
    
    // Signal ready for new hand if we have enough players
    const playersWithChips = this.room.players.filter((p) => p.chips > 0);
    if (playersWithChips.length >= 2) {
      this.emit("readyForNewHand");
    }
  }
}

export type { Stage, GameState };
