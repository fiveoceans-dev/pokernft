import { Player, PlayerAction, PlayerState, Table, Round } from "./types";
import { draw } from "./utils";
import { ACTION_TIMEOUT_MS } from "./constants";

/** Handlers invoked when timers resolve to auto actions */
export interface TimerHandlers {
  onAutoAction: (playerId: string, action: PlayerAction) => void;
}

/**
 * TimerService manages per‑action timers, optional timebank consumption,
 * disconnect grace periods and animation delays between game events.
 */
export class TimerService {
  private turnTimer?: ReturnType<typeof setTimeout>;
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private table: Table,
    private handlers: TimerHandlers,
    private disconnectGraceMs = 0,
  ) {}

  /** Clear any active action timer */
  private clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = undefined;
    }
  }

  /** Begin countdown for the given player's action */
  startActionTimer(player: Player) {
    this.clearTurnTimer();

    const forceAction = () => {
      const action =
        this.table.betToCall > 0 ? PlayerAction.FOLD : PlayerAction.CHECK;
      this.handlers.onAutoAction(player.id, action);
    };

    // initial per-action timer
    this.turnTimer = setTimeout(() => {
      if (player.timebankMs > 0) {
        const extra = player.timebankMs;
        player.timebankMs = 0;
        this.turnTimer = setTimeout(forceAction, extra);
      } else {
        forceAction();
      }
    }, this.table.actionTimer || ACTION_TIMEOUT_MS);
  }

  /** Handle player disconnection with a grace timer */
  handleDisconnect(player: Player) {
    this.clearDisconnectTimer(player.id);

    const expire = () => {
      const forceAction = () => {
        const action =
          this.table.betToCall > 0 ? PlayerAction.FOLD : PlayerAction.CHECK;
        this.handlers.onAutoAction(player.id, action);
        this.disconnectTimers.delete(player.id);
      };

      if (player.timebankMs > 0) {
        const extra = player.timebankMs;
        player.timebankMs = 0;
        const tbTimer = setTimeout(forceAction, extra);
        this.disconnectTimers.set(player.id, tbTimer);
      } else {
        forceAction();
      }
    };

    const timer = setTimeout(expire, this.disconnectGraceMs);
    this.disconnectTimers.set(player.id, timer);
  }

  /** Clear disconnect timer on reconnection */
  handleReconnect(playerId: string) {
    this.clearDisconnectTimer(playerId);
  }

  private clearDisconnectTimer(id: string) {
    const timer = this.disconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(id);
    }
  }

  /** Utility: wait for a number of milliseconds */
  static wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  /** Deal hole cards with animation delays */
  async dealHoleAnimated(table: Table) {
    if (!table.deck.length) return;
    const len = table.seats.length;
    for (let i = 0; i < 2; i++) {
      for (let offset = 0; offset < len; offset++) {
        const idx = (table.smallBlindIndex + offset) % len;
        const player = table.seats[idx];
        if (player && player.state !== PlayerState.SITTING_OUT) {
          player.holeCards.push(draw(table.deck));
          await TimerService.wait(table.dealAnimationDelayMs);
        }
      }
    }
  }

  /** Deal board cards with animation delays */
  async dealBoardAnimated(table: Table, round: Round) {
    if (!table.deck.length) return;
    // burn card
    draw(table.deck);
    await TimerService.wait(table.dealAnimationDelayMs);
    if (round === Round.FLOP) {
      for (let i = 0; i < 3; i++) {
        table.board.push(draw(table.deck));
        await TimerService.wait(table.dealAnimationDelayMs);
      }
    } else if (round === Round.TURN || round === Round.RIVER) {
      table.board.push(draw(table.deck));
    }
  }

  /** Pause between hands after payouts */
  async interRoundPause() {
    await TimerService.wait(this.table.interRoundDelayMs);
  }
}

export default TimerService;
