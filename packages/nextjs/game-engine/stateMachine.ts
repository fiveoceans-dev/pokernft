export enum GameState {
  WaitingForPlayers = "WaitingForPlayers",
  Shuffling = "Shuffling",
  Dealing = "Dealing",
  Betting = "Betting",
  Showdown = "Showdown",
  Payout = "Payout",
  Paused = "Paused",
}

export enum BettingRound {
  PreFlop = "PreFlop",
  Flop = "Flop",
  Turn = "Turn",
  River = "River",
}

export type Event =
  | { type: "PLAYERS_READY" }
  | { type: "SHUFFLE_COMPLETE" }
  | { type: "DEAL_COMPLETE" }
  | { type: "BETTING_COMPLETE"; remainingPlayers: number }
  | { type: "SHOWDOWN_COMPLETE" }
  | { type: "PAYOUT_COMPLETE" }
  | { type: "PAUSE"; reason: string }
  | { type: "RESUME" };

/**
 * PokerStateMachine models the round-based state transitions for a single table.
 * It focuses purely on state progression; networking, RNG, evaluation and I/O are pluggable.
 */
export class PokerStateMachine {
  public state: GameState = GameState.WaitingForPlayers;
  public round: BettingRound | null = null;
  public history: GameState[] = [this.state];

  private transition(next: GameState) {
    this.state = next;
    this.history.push(next);
  }

  dispatch(event: Event) {
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
          } else if (this.round === BettingRound.PreFlop) {
            this.round = BettingRound.Flop;
          } else if (this.round === BettingRound.Flop) {
            this.round = BettingRound.Turn;
          } else if (this.round === BettingRound.Turn) {
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
          const prev =
            this.history[this.history.length - 2] ||
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

export default PokerStateMachine;
