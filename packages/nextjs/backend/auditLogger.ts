import { HandAction, PlayerAction, Round } from "./types";

/**
 * Simple in-memory audit logger storing actions for the current hand.
 * Provides helpers to start a new log, record actions and read back the
 * immutable list of actions for persistence or analysis.
 */
export class AuditLogger {
  private actions: HandAction[] = [];
  private startTs = 0;

  /** Reset the logger for a new hand */
  startHand() {
    this.actions = [];
    this.startTs = Date.now();
  }

  /** Record a hand action with the elapsed time since hand start */
  record(playerId: string, round: Round, action: PlayerAction, amount = 0) {
    const elapsedMs = Date.now() - this.startTs;
    this.actions.push({ playerId, round, action, amount, elapsedMs });
  }

  /** Return a read-only view of the logged actions */
  get handActions(): readonly HandAction[] {
    return this.actions;
  }
}

export default AuditLogger;
