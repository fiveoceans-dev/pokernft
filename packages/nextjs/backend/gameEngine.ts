import {
  GameRoom,
  PlayerSession,
  Stage,
} from './types';
import {
  createRoom as createRoomImpl,
  addPlayer as addPlayerImpl,
  startHand as startHandImpl,
  handleAction as handleActionImpl,
  nextTurn as nextTurnImpl,
  progressStage as progressStageImpl,
  determineWinners as determineWinnersImpl,
  isRoundComplete as isRoundCompleteImpl,
  payout as payoutImpl,
} from './room';

/**
 * Object oriented wrapper around the functional room helpers.  This provides a
 * single engine instance that owns a {@link GameRoom} and exposes methods used
 * by the frontend's view‑model.
 */
export class GameEngine {
  private room: GameRoom;

  constructor(id: string, minBet = 10) {
    this.room = createRoomImpl(id, minBet);
  }

  /** Retrieve mutable room state */
  getState(): GameRoom {
    return this.room;
  }

  /** Seat a new player */
  addPlayer(
    player: Omit<
      PlayerSession,
      'isDealer' | 'isTurn' | 'hand' | 'hasFolded' | 'currentBet' | 'tableId'
    >,
  ): PlayerSession {
    return addPlayerImpl(this.room, player);
  }

  /** Start a fresh hand */
  startHand() {
    startHandImpl(this.room);
  }

  /** Apply an action for the given player */
  handleAction(
    playerId: string,
    action: { type: 'fold' | 'call' | 'raise' | 'check'; amount?: number },
  ) {
    handleActionImpl(this.room, playerId, action);
  }

  /** Move action to the next player */
  nextTurn() {
    nextTurnImpl(this.room);
  }

  /** Advance to the next game stage */
  progressStage() {
    progressStageImpl(this.room);
  }

  /** Determine winners for the current hand */
  determineWinners(): PlayerSession[] {
    return determineWinnersImpl(this.room);
  }

  /** Check if all active players have matched the highest bet */
  isRoundComplete(): boolean {
    return isRoundCompleteImpl(this.room);
  }

  /** Split the pot amongst winners */
  payout(winners: PlayerSession[]) {
    payoutImpl(this.room, winners);
  }
}

export type { Stage };
