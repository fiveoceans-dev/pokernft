"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableStateMachine = void 0;
const types_1 = require("./types");
/**
 * Basic finite state machine for a poker table. It advances through the
 * canonical sequence of states for a single hand.
 */
class TableStateMachine {
    constructor() {
        this.state = types_1.TableState.WAITING;
    }
    dispatch(event) {
        switch (this.state) {
            case types_1.TableState.WAITING:
                if (event.type === "START_HAND" && event.activeSeats >= 2) {
                    this.state = types_1.TableState.BLINDS;
                }
                break;
            case types_1.TableState.BLINDS:
                if (event.type === "BLINDS_POSTED") {
                    this.state = types_1.TableState.DEALING_HOLE;
                }
                break;
            case types_1.TableState.DEALING_HOLE:
                if (event.type === "DEALING_COMPLETE") {
                    this.state = types_1.TableState.PRE_FLOP;
                }
                break;
            case types_1.TableState.PRE_FLOP:
                if (event.type === "BETTING_COMPLETE") {
                    this.state =
                        event.remainingPlayers > 1 ? types_1.TableState.FLOP : types_1.TableState.PAYOUT;
                }
                break;
            case types_1.TableState.FLOP:
                if (event.type === "BETTING_COMPLETE") {
                    this.state =
                        event.remainingPlayers > 1 ? types_1.TableState.TURN : types_1.TableState.PAYOUT;
                }
                break;
            case types_1.TableState.TURN:
                if (event.type === "BETTING_COMPLETE") {
                    this.state =
                        event.remainingPlayers > 1 ? types_1.TableState.RIVER : types_1.TableState.PAYOUT;
                }
                break;
            case types_1.TableState.RIVER:
                if (event.type === "BETTING_COMPLETE") {
                    this.state =
                        event.remainingPlayers > 1
                            ? types_1.TableState.SHOWDOWN
                            : types_1.TableState.PAYOUT;
                }
                break;
            case types_1.TableState.SHOWDOWN:
                if (event.type === "SHOWDOWN_COMPLETE") {
                    this.state = types_1.TableState.PAYOUT;
                }
                break;
            case types_1.TableState.PAYOUT:
                if (event.type === "PAYOUT_COMPLETE") {
                    this.state = types_1.TableState.ROTATE;
                }
                break;
            case types_1.TableState.ROTATE:
                if (event.type === "ROTATION_COMPLETE") {
                    this.state = types_1.TableState.CLEANUP;
                }
                break;
            case types_1.TableState.CLEANUP:
                if (event.type === "CLEANUP_COMPLETE") {
                    this.state =
                        event.activeSeats >= 2 ? types_1.TableState.BLINDS : types_1.TableState.WAITING;
                }
                break;
        }
    }
}
exports.TableStateMachine = TableStateMachine;
//# sourceMappingURL=tableStateMachine.js.map