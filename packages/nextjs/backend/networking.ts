import type { Card, Table, PlayerAction, Round } from "./types";

export type BlindType = "SMALL" | "BIG";

export type ServerEvent =
  | { type: "TABLE_SNAPSHOT"; table: Table }
  | { type: "HAND_START" }
  | { type: "BLINDS_POSTED" }
  | { type: "DEAL_HOLE"; seat: number; cards: [Card, Card] }
  | {
      type: "ACTION_PROMPT";
      actingIndex: number;
      betToCall: number;
      minRaise: number;
      timeLeftMs: number;
    }
  | {
      type: "PLAYER_ACTION_APPLIED";
      playerId: string;
      action: PlayerAction;
      amount?: number;
    }
  | { type: "ROUND_END"; street: Round }
  | { type: "DEAL_FLOP"; cards: [Card, Card, Card] }
  | { type: "DEAL_TURN"; card: Card }
  | { type: "DEAL_RIVER"; card: Card }
  | { type: "SHOWDOWN"; revealOrder: string[] }
  | {
      type: "PAYOUT";
      potBreakdown: Array<{
        playerId: string;
        amount: number;
        potIndex: number;
      }>;
    }
  | { type: "HAND_END" }
  | { type: "BUTTON_MOVED"; buttonIndex: number }
  | { type: "ERROR"; code: string; msg: string };

export type ClientCommand =
  | { cmdId: string; type: "SIT"; buyIn: number }
  | { cmdId: string; type: "LEAVE" }
  | { cmdId: string; type: "SIT_OUT" }
  | { cmdId: string; type: "SIT_IN" }
  | { cmdId: string; type: "POST_BLIND"; blindType: BlindType }
  | {
      cmdId: string;
      type: "ACTION";
      action: "Fold" | "Check" | "Call" | "Bet" | "Raise" | "AllIn";
      amount?: number;
    }
  | { cmdId: string; type: "REBUY"; amount: number };
