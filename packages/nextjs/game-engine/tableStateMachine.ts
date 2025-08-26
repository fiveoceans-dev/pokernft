import { TableState } from "./types";

export type TableEvent =
  | { type: "START_HAND"; activeSeats: number }
  | { type: "BLINDS_POSTED" }
  | { type: "DEALING_COMPLETE" }
  | { type: "BETTING_COMPLETE"; remainingPlayers: number }
  | { type: "SHOWDOWN_COMPLETE" }
  | { type: "PAYOUT_COMPLETE" }
  | { type: "ROTATION_COMPLETE" }
  | { type: "CLEANUP_COMPLETE"; activeSeats: number };

/**
 * Basic finite state machine for a poker table. It advances through the
 * canonical sequence of states for a single hand.
 */
export class TableStateMachine {
  public state: TableState = TableState.WAITING;

  dispatch(event: TableEvent) {
    switch (this.state) {
      case TableState.WAITING:
        if (event.type === "START_HAND" && event.activeSeats >= 2) {
          this.state = TableState.BLINDS;
        }
        break;
      case TableState.BLINDS:
        if (event.type === "BLINDS_POSTED") {
          this.state = TableState.DEALING_HOLE;
        }
        break;
      case TableState.DEALING_HOLE:
        if (event.type === "DEALING_COMPLETE") {
          this.state = TableState.PRE_FLOP;
        }
        break;
      case TableState.PRE_FLOP:
        if (event.type === "BETTING_COMPLETE") {
          this.state =
            event.remainingPlayers > 1 ? TableState.FLOP : TableState.PAYOUT;
        }
        break;
      case TableState.FLOP:
        if (event.type === "BETTING_COMPLETE") {
          this.state =
            event.remainingPlayers > 1 ? TableState.TURN : TableState.PAYOUT;
        }
        break;
      case TableState.TURN:
        if (event.type === "BETTING_COMPLETE") {
          this.state =
            event.remainingPlayers > 1 ? TableState.RIVER : TableState.PAYOUT;
        }
        break;
      case TableState.RIVER:
        if (event.type === "BETTING_COMPLETE") {
          this.state =
            event.remainingPlayers > 1
              ? TableState.SHOWDOWN
              : TableState.PAYOUT;
        }
        break;
      case TableState.SHOWDOWN:
        if (event.type === "SHOWDOWN_COMPLETE") {
          this.state = TableState.PAYOUT;
        }
        break;
      case TableState.PAYOUT:
        if (event.type === "PAYOUT_COMPLETE") {
          this.state = TableState.ROTATE;
        }
        break;
      case TableState.ROTATE:
        if (event.type === "ROTATION_COMPLETE") {
          this.state = TableState.CLEANUP;
        }
        break;
      case TableState.CLEANUP:
        if (event.type === "CLEANUP_COMPLETE") {
          this.state =
            event.activeSeats >= 2 ? TableState.BLINDS : TableState.WAITING;
        }
        break;
    }
  }
}
