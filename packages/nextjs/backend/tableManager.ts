import {
  Table,
  PlayerAction,
  Round,
  TableState,
} from './types';
import { TableStateMachine } from './tableStateMachine';
import { startHand as startHandLifecycle, endHand } from './handLifecycle';
import {
  applyAction,
  isRoundComplete,
  startBettingRound,
} from './bettingEngine';
import { dealBoard } from './dealer';
import { countActivePlayers } from './tableUtils';

/**
 * TableManager orchestrates the hand lifecycle for a single table. It uses the
 * lower level modules (dealer, betting engine, etc.) and advances the
 * {@link TableStateMachine} according to PokerTH's workflow.
 */
export class TableManager {
  private fsm: TableStateMachine;
  constructor(public table: Table) {
    this.fsm = new TableStateMachine();
    this.fsm.state = table.state;
  }

  /** Attempt to begin a new hand */
  startHand(): boolean {
    this.fsm.dispatch({
      type: 'START_HAND',
      activeSeats: countActivePlayers(this.table),
    });
    if (this.fsm.state !== TableState.BLINDS) return false;
    const ok = startHandLifecycle(this.table);
    if (ok) {
      this.fsm.dispatch({ type: 'BLINDS_POSTED' });
      this.fsm.dispatch({ type: 'DEALING_COMPLETE' });
    }
    return ok;
  }

  /** Apply an action for the given seat and progress the hand if needed. */
  async handleAction(
    seatIndex: number,
    action: { type: PlayerAction; amount?: number },
  ) {
    applyAction(this.table, seatIndex, action);
    if (!isRoundComplete(this.table)) return;

    const remaining = countActivePlayers(this.table);
    this.fsm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: remaining });

    switch (this.fsm.state) {
      case TableState.FLOP:
        dealBoard(this.table, Round.FLOP);
        this.table.currentRound = Round.FLOP;
        startBettingRound(this.table, Round.FLOP);
        break;
      case TableState.TURN:
        dealBoard(this.table, Round.TURN);
        this.table.currentRound = Round.TURN;
        startBettingRound(this.table, Round.TURN);
        break;
      case TableState.RIVER:
        dealBoard(this.table, Round.RIVER);
        this.table.currentRound = Round.RIVER;
        startBettingRound(this.table, Round.RIVER);
        break;
      case TableState.SHOWDOWN:
      case TableState.PAYOUT:
        await endHand(this.table);
        this.fsm.dispatch({ type: 'PAYOUT_COMPLETE' });
        this.fsm.dispatch({ type: 'ROTATION_COMPLETE' });
        this.fsm.dispatch({
          type: 'CLEANUP_COMPLETE',
          activeSeats: countActivePlayers(this.table),
        });
        break;
    }
  }
}

export default TableManager;
