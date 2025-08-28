import { EventEmitter } from "events";
import { GameRoom, PlayerSession, Stage, RoomActionType } from "./types";
import {
  createRoom as createRoomImpl,
  addPlayer as addPlayerImpl,
  startRoomHand as startHandImpl,
  // handleAction as handleActionImpl, // Function removed
  progressStage as progressStageImpl,
  determineWinners as determineWinnersImpl,
  isRoomRoundComplete as isRoundCompleteImpl,
  payout as payoutImpl,
} from "./room";
import { PokerStateMachine, GameState } from "../state/stateMachine";
import { GameController } from "../data-structures/GameController";

/**
 * Central game engine orchestrating table workflow.  It wraps the low level
 * room helpers, drives the {@link PokerStateMachine} and emits events when
 * phases or table state change.
 */
export class GameEngine extends EventEmitter {
  private room: GameRoom;
  private machine: PokerStateMachine;
  private showdownTimer: NodeJS.Timeout | null = null;
  private actionTimeoutMs: number;
  private gameController: GameController | null = null;

  constructor(id: string, minBet = 10, actionTimeoutSeconds = 10) {
    super();
    // console.log(`🎮 [GameEngine] Creating new game engine for table ${id} with minBet $${minBet}, actionTimeout: ${actionTimeoutSeconds}s`);
    this.room = createRoomImpl(id, minBet);
    this.machine = new PokerStateMachine();
    this.actionTimeoutMs = actionTimeoutSeconds * 1000;
    
    // Initialize GameController with timer system
    this.gameController = new GameController(this.room);
    this.gameController.setActionTimeout(this.actionTimeoutMs);
    this.setupTimerCallbacks();
    this.setupTimerEvents();
    
    // console.log(`✅ [GameEngine] Game engine created successfully for table ${id}`);
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
    
    // Check if game should auto-start with new player
    this.checkAutoStart();
    
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
    
    // Check if game countdown should be cancelled with fewer players
    if (this.room.stage === "waiting") {
      const activePlayers = this.room.players.filter(p => p.chips > 0);
      if (activePlayers.length < 2) {
        this.gameController!.getTimerManager().cancelGameStart();
      }
    }
    
    this.emit("stateChanged", this.room);
    return true;
  }

  /** Start a fresh hand */
  startHand() {
    // console.log(`🎯 [GameEngine] Starting new hand for table ${this.room.id} with ${this.room.players.length} players`);
    
    // Clear any existing showdown timer when starting a new hand
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
      console.log(`🔄 [GameEngine] Cleared existing showdown timer`);
    }
    
    this.machine.dispatch({ type: "PLAYERS_READY" });
    this.machine.dispatch({ type: "SHUFFLE_COMPLETE" });
    
    // Use GameController for complete new hand logic
    console.log(`🎮 [GameEngine] Using GameController for new hand`);
    this.gameController!.startNewHand();
    
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
        timeLeftMs: this.actionTimeoutMs
      });
    }
  }

  /** Apply an action for the given player */
  handleAction(
    playerId: string,
    action: { type: "fold" | "call" | "raise" | "check"; amount?: number },
  ) {
    console.log(`🎮 [GameEngine] Player ${playerId} action: ${action.type}${action.amount ? ` $${action.amount}` : ''}`);
    
    // BULLETPROOF ACTION BLOCKING - Prevent any actions when game has ended
    if (this.room.stage === "waiting") {
      console.warn(`🚫 [GameEngine] Action ${action.type} blocked - game has ended (stage: waiting)`);
      throw new Error("Cannot perform actions - game has ended");
    }
    
    // Pre-validate that at least 2 players are still active
    const activePlayersBeforeAction = this.room.players.filter(p => !p.hasFolded);
    if (activePlayersBeforeAction.length <= 1) {
      console.warn(`🚫 [GameEngine] Action ${action.type} blocked - only ${activePlayersBeforeAction.length} active players remaining`);
      throw new Error("Cannot perform actions - insufficient active players");
    }
    
    // Use GameController for action processing
    const result = this.gameController!.processAction(playerId, action.type as any, action.amount);
    
    if (!result.success) {
      console.warn(`🚫 [GameEngine] GameController rejected action: ${result.error}`);
      throw new Error(result.error || "Invalid action");
    }
    
    // GameController handles all state updates internally
    this.emit("stateChanged", this.room);
    
    if (result.gameComplete) {
      this.handleWinnerScenario();
      return;
    }
    
    if (result.roundComplete) {
      this.resolveRound();
      return;
    }
    
    // Use unified winner scenario handler - single source of truth
    if (this.handleWinnerScenario()) {
      return; // Game ended with winner, no further processing needed
    }
    
    // Always emit turnChanged event when there's a next player (even if roundComplete is false)
    // This ensures the UI updates properly when the turn advances
    const currentPlayer = this.room.players[this.room.currentTurnIndex];
    const roomStage = this.room.stage as Stage;
    if (currentPlayer && currentPlayer.isTurn && roomStage !== "waiting" && roomStage !== "showdown") {
      const maxBet = Math.max(0, ...this.room.players.map((p) => p.currentBet));
      const betToCall = Math.max(0, maxBet - currentPlayer.currentBet);
      console.log(`🎮 [GameEngine] Turn advanced to ${currentPlayer.id} at seat ${currentPlayer.seat} (array index ${this.room.currentTurnIndex})`);
      this.emit("turnChanged", {
        playerId: currentPlayer.id,
        playerArrayIndex: this.room.currentTurnIndex, // for server internal use
        actingIndex: currentPlayer.seat, // this is the SEAT INDEX (0-8) that client expects
        betToCall,
        minRaise: Math.max(this.room.minBet, maxBet + this.room.minBet),
        timeLeftMs: this.actionTimeoutMs
      });
    }
  }

  /** manually advance stage (used for dev controls) */
  progressStage() {
    const prevStage = this.room.stage;
    console.log(`⏭️ [GameEngine] Manually advancing stage from ${prevStage} for table ${this.room.id}`);
    
    // Use GameController for stage progression
    this.gameController!.progressStage();
    
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
        timeLeftMs: this.actionTimeoutMs
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
    
    // Emit winner announcement with seat indexes
    const winnerInfo = winners.map(winner => ({
      seat: this.room.players.findIndex(p => p.id === winner.id),
      playerId: winner.id
    }));
    
    this.emit("winnerAnnouncement", {
      winners: winnerInfo,
      potAmount: potAmount
    });
    
    // Emit dealer message after payout
    this.emit("dealerMessage", winnerMessage);
    this.emit("stateChanged", this.room);
  }

  private resolveRound() {
    const remaining = this.room.players.filter((p) => !p.hasFolded).length;
    
    // Check if we should fast-forward due to all-in scenario
    const activePlayers = this.room.players.filter(p => !p.hasFolded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const shouldFastForward = playersWithChips.length <= 1;
    
    if (shouldFastForward) {
      console.log(`⚡ [GameEngine] Fast-forwarding to showdown - no more betting possible`);
      this.gameController!.fastForwardToShowdown();
      
      // Go directly to showdown
      const winners = determineWinnersImpl(this.room);
      const potAmount = this.room.pot;
      
      console.log(`🃏 [GameEngine] Fast-forward showdown - ${winners.length} winner(s), pot: $${potAmount}`);
      
      // Set timer for showdown completion
      if (this.showdownTimer) {
        clearTimeout(this.showdownTimer);
      }
      
      this.showdownTimer = setTimeout(() => {
        this.completeShowdown(winners, potAmount);
      }, 4000);
      
      // Emit events for fast-forward showdown
      this.emit("phaseChanged", this.machine.state);
      this.emit("stageChanged", this.room.stage);
      this.emit("stateChanged", this.room);
      this.emit("showdownStarted", { winners: winners.map(w => w.id), potAmount });
      return;
    }
    
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
      this.gameController!.progressStage(); // advance to showdown
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

    // Use GameController for stage progression
    this.gameController!.progressStage();
    
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
        timeLeftMs: this.actionTimeoutMs
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

  /**
   * Unified winner scenario handler - detects single winner, awards pot, blocks actions, triggers new hand
   * This is the single source of truth for all winner scenarios (fold-induced or showdown)
   */
  private handleWinnerScenario(): boolean {
    const activePlayersAfterAction = this.room.players.filter(p => !p.hasFolded);
    
    if (activePlayersAfterAction.length === 1) {
      const winner = activePlayersAfterAction[0];
      const potAmount = this.room.pot;
      
      console.log(`🏆 [GameEngine] UNIFIED WINNER SCENARIO: ${winner.id} wins $${potAmount} (${activePlayersAfterAction.length} active players remaining)`);
      
      // Immediate game termination - block ALL future actions
      this.room.stage = "waiting";
      this.room.players.forEach((p) => {
        p.isTurn = false; // Clear all turn states immediately
      });
      
      // Award the pot to winner
      winner.chips += potAmount;
      this.room.pot = 0;
      
      // Complete cleanup of hand state
      this.room.players.forEach((p) => {
        p.hasFolded = false;
        p.hand = [];
        p.currentBet = 0;
        p.isDealer = false;
      });
      this.room.communityCards = [];
      this.room.currentTurnIndex = 0;
      this.room.firstToActIndex = 0;
      this.room.lastAggressorIndex = 0;
      
      // Update state machine and emit events
      this.machine.dispatch({ type: "PAYOUT_COMPLETE" });
      
      const winnerMessage = `${winner.id.slice(0, 6)}...${winner.id.slice(-4)} wins $${potAmount} (others folded)`;
      console.log(`💰 [GameEngine] ${winnerMessage}`);
      
      // Emit winner announcement with seat index
      const winnerSeat = this.room.players.findIndex(p => p.id === winner.id);
      this.emit("winnerAnnouncement", {
        winners: [{ seat: winnerSeat, playerId: winner.id }],
        potAmount: potAmount
      });
      
      // Emit all necessary events
      this.emit("phaseChanged", this.machine.state);
      this.emit("handEnded", [winner]);
      this.emit("dealerMessage", winnerMessage);
      this.emit("stateChanged", this.room);
      
      // Signal ready for new hand if we have enough players
      const playersWithChips = this.room.players.filter((p) => p.chips > 0);
      if (playersWithChips.length >= 2) {
        console.log(`🔄 [GameEngine] Ready for new hand with ${playersWithChips.length} players`);
        this.emit("readyForNewHand");
      }
      
      return true; // Game ended with winner
    }
    
    return false; // Game continues
  }

  /**
   * Setup timer callbacks for GameController
   */
  private setupTimerCallbacks(): void {
    this.gameController!.setTimerCallbacks({
      onGameAutoStart: () => {
        console.log(`🚀 [GameEngine] Auto-starting game from timer`);
        this.emit("gameAutoStarted");
        this.emit("stateChanged", this.room);
      },
      onShowdownComplete: () => {
        console.log(`⏰ [GameEngine] Showdown timer complete - starting new hand`);
        this.startHand();
      },
      onActionTimeout: (playerId: string, action: RoomActionType) => {
        console.log(`⏰ [GameEngine] Timer expired for ${playerId}, executing auto-action: ${action}`);
        
        try {
          // Process the auto-action through the normal flow
          console.log(`🎮 [GameEngine] Processing timer auto-action for ${playerId}: ${action}`);
          const result = this.handleAction(playerId, { type: action as "fold" | "call" | "raise" | "check" });
          console.log(`✅ [GameEngine] Timer auto-action completed successfully for ${playerId}:`, result);
          
          
        } catch (error) {
          console.error(`❌ [GameEngine] Failed to process timer auto-action for ${playerId}:`, {
            playerId,
            action,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
          
          // If auto-action fails, try to fold the player as fallback
          console.log(`🔧 [GameEngine] Attempting fallback auto-fold for ${playerId}`);
          try {
            const foldResult = this.handleAction(playerId, { type: "fold" });
            console.log(`✅ [GameEngine] Fallback auto-fold successful for ${playerId}:`, foldResult);
          } catch (foldError) {
            console.error(`❌ [GameEngine] CRITICAL: Failed to auto-fold ${playerId}:`, {
              playerId,
              originalAction: action,
              foldError: foldError instanceof Error ? foldError.message : String(foldError),
              foldStack: foldError instanceof Error ? foldError.stack : undefined,
              timestamp: new Date().toISOString()
            });
            
            // Last resort: try to emit state change to keep UI responsive
            try {
              console.log(`🚨 [GameEngine] Last resort: forcing state change after failed timer callback`);
              this.emit("stateChanged", this.room);
            } catch (emitError) {
              console.error(`💀 [GameEngine] FATAL: Unable to recover from timer callback failure:`, emitError);
            }
          }
        }
      }
    });
  }

  /**
   * Setup timer event forwarding to UI
   */
  private setupTimerEvents(): void {
    const timerManager = this.gameController!.getTimerManager();
    
    // Forward timer events to UI
    timerManager.on('game-start-countdown', (remainingMs) => {
      this.emit('gameStartCountdown', { remainingMs });
    });
    
    timerManager.on('game-start-cancelled', () => {
      this.emit('gameStartCancelled');
    });
    
    timerManager.on('game-start-triggered', () => {
      this.emit('gameStartTriggered');
    });
    
    timerManager.on('showdown-countdown', (remainingMs) => {
      this.emit('showdownCountdown', { remainingMs });
    });
    
    timerManager.on('showdown-complete', () => {
      this.emit('showdownComplete');
    });
    
    timerManager.on('action-countdown', (playerId, remainingMs) => {
      this.emit('actionCountdown', { playerId, remainingMs });
    });
    
    timerManager.on('action-warning', (playerId, remainingMs) => {
      this.emit('actionWarning', { playerId, remainingMs });
    });
    
    timerManager.on('action-timeout', (playerId) => {
      this.emit('actionTimeout', { playerId });
    });
  }

  /**
   * Check if game should auto-start when players join
   */
  private checkAutoStart(): void {
    if (this.room.stage === "waiting") {
      this.gameController!.checkGameStart();
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
    }
    
    this.gameController!.destroy();
    
    this.removeAllListeners();
  }
}

export type { Stage, GameState };
