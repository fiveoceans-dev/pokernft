import type { Card, Table } from "./types";

export type ServerEvent =
  | { type: "TABLE_SNAPSHOT"; table: Table }
  | { type: "HAND_START" }
  | { type: "BLINDS_POSTED" }
  | { type: "DEAL_HOLE" }
  | {
      type: "ACTION_PROMPT";
      actingIndex: number;
      betToCall: number;
      minRaise: number;
      timeLeftMs: number;
    }
  | {
      type: "PLAYER_ACTION_APPLIED";
      seatIndex: number;
      action: string;
      amount: number;
    }
  | { type: "ROUND_END"; street: string }
  | { type: "DEAL_FLOP"; cards: [Card, Card, Card] }
  | { type: "DEAL_TURN"; card: Card }
  | { type: "DEAL_RIVER"; card: Card }
  | { type: "SHOWDOWN"; revealOrder: number[] }
  | {
      type: "PAYOUT";
      potBreakdown: Array<{
        seatIndex: number;
        amount: number;
        potIndex: number;
      }>;
    }
  | { type: "HAND_END" }
  | { type: "BUTTON_MOVED"; buttonIndex: number }
  | { type: "ERROR"; code: string; msg: string };

export type ClientCommand =
  | {
      cmdId: string;
      type: "SIT";
      playerId: string;
      nickname: string;
      buyIn: number;
    }
  | { cmdId: string; type: "LEAVE"; playerId: string }
  | { cmdId: string; type: "SIT_OUT"; playerId: string }
  | { cmdId: string; type: "SIT_IN"; playerId: string }
  | {
      cmdId: string;
      type: "POST_BLIND";
      playerId: string;
      blind: "SMALL" | "BIG";
    }
  | { cmdId: string; type: "START_HAND" }
  | {
      cmdId: string;
      type: "ACTION";
      playerId: string;
      action: { type: "fold" | "call" | "raise" | "check"; amount?: number };
    }
  | { cmdId: string; type: "REBUY"; playerId: string; amount: number };
