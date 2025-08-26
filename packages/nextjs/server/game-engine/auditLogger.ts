import { HandAction, PlayerAction, Round } from "./types";

/**
 * Simple in-memory audit logger storing actions for the current hand.
 * Provides helpers to start a new log, record actions and read back the
 * immutable list of actions for persistence or analysis.
 */
export class AuditLogger {
  private actions: HandAction[] = [];
  private startTs = 0;
  private seed = "";
  private rake = 0;

  /** Reset the logger for a new hand */
  startHand(deckSeed: string) {
    this.actions = [];
    this.startTs = Date.now();
    this.seed = deckSeed;
    this.rake = 0;
  }

  /** Record a hand action with the elapsed time since hand start */
  record(playerId: string, round: Round, action: PlayerAction, amount = 0) {
    const elapsedMs = Date.now() - this.startTs;
    this.actions.push({ playerId, round, action, amount, elapsedMs });
  }

  /** Record total rake taken for the hand */
  recordRake(amount: number) {
    this.rake = amount;
  }

  /** Return a read-only view of the logged actions */
  get handActions(): readonly HandAction[] {
    return this.actions;
  }

  get deckSeed(): string {
    return this.seed;
  }

  get totalRake(): number {
    return this.rake;
  }
}

export default AuditLogger;
