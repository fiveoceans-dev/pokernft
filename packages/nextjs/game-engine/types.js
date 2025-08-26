"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadBlindRule = exports.Round = exports.TableState = exports.PlayerAction = exports.PlayerState = void 0;
var PlayerState;
(function (PlayerState) {
    PlayerState["EMPTY"] = "EMPTY";
    PlayerState["SEATED"] = "SEATED";
    PlayerState["SITTING_OUT"] = "SITTING_OUT";
    PlayerState["ACTIVE"] = "ACTIVE";
    PlayerState["FOLDED"] = "FOLDED";
    PlayerState["ALL_IN"] = "ALL_IN";
    PlayerState["DISCONNECTED"] = "DISCONNECTED";
    PlayerState["LEAVING"] = "LEAVING";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
var PlayerAction;
(function (PlayerAction) {
    PlayerAction["NONE"] = "NONE";
    PlayerAction["FOLD"] = "FOLD";
    PlayerAction["CHECK"] = "CHECK";
    PlayerAction["CALL"] = "CALL";
    PlayerAction["BET"] = "BET";
    PlayerAction["RAISE"] = "RAISE";
    PlayerAction["ALL_IN"] = "ALL_IN";
})(PlayerAction || (exports.PlayerAction = PlayerAction = {}));
var TableState;
(function (TableState) {
    TableState["WAITING"] = "WAITING";
    TableState["BLINDS"] = "BLINDS";
    TableState["DEALING_HOLE"] = "DEALING_HOLE";
    TableState["PRE_FLOP"] = "PRE_FLOP";
    TableState["FLOP"] = "FLOP";
    TableState["TURN"] = "TURN";
    TableState["RIVER"] = "RIVER";
    TableState["SHOWDOWN"] = "SHOWDOWN";
    TableState["PAYOUT"] = "PAYOUT";
    TableState["ROTATE"] = "ROTATE";
    TableState["CLEANUP"] = "CLEANUP";
})(TableState || (exports.TableState = TableState = {}));
var Round;
(function (Round) {
    Round["PREFLOP"] = "PREFLOP";
    Round["FLOP"] = "FLOP";
    Round["TURN"] = "TURN";
    Round["RIVER"] = "RIVER";
})(Round || (exports.Round = Round = {}));
var DeadBlindRule;
(function (DeadBlindRule) {
    /** Returning players must post any missed blinds immediately */
    DeadBlindRule["POST"] = "POST";
    /** Returning players must wait until the big blind to resume */
    DeadBlindRule["WAIT"] = "WAIT";
})(DeadBlindRule || (exports.DeadBlindRule = DeadBlindRule = {}));
//# sourceMappingURL=types.js.map