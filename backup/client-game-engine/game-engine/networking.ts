import type { Card, Table, PlayerAction, Round } from "./types";

export interface LobbyTable {
  id: string;
  name: string;
  gameType: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
}

export type BlindType = "SMALL" | "BIG";

export type ServerEvent =
  | { tableId: string; type: "SESSION"; sessionId: string; userId?: string }
  | { tableId: string; type: "TABLE_SNAPSHOT"; table: Table }
  | { tableId: ""; type: "TABLE_LIST"; tables: LobbyTable[] }
  | { tableId: string; type: "TABLE_CREATED"; table: LobbyTable }
  | { tableId: string; type: "HAND_START" }
  | { tableId: string; type: "BLINDS_POSTED" }
  | { tableId: string; type: "DEAL_HOLE"; seat: number; cards: [Card, Card] }
  | { tableId: string; type: "PLAYER_JOINED"; seat: number; playerId: string }
  | { tableId: string; type: "PLAYER_LEFT"; seat: number; playerId: string }
  | {
      tableId: string;
      type: "PLAYER_DISCONNECTED";
      seat: number;
      playerId: string;
    }
  | { tableId: string; type: "PLAYER_REJOINED"; seat: number; playerId: string }
  | {
      tableId: string;
      type: "ACTION_PROMPT";
      actingIndex: number;
      betToCall: number;
      minRaise: number;
      timeLeftMs: number;
    }
  | {
      tableId: string;
      type: "PLAYER_ACTION_APPLIED";
      playerId: string;
      action: PlayerAction;
      amount?: number;
    }
  | { tableId: string; type: "ROUND_END"; street: Round }
  | { tableId: string; type: "DEAL_FLOP"; cards: [Card, Card, Card] }
  | { tableId: string; type: "DEAL_TURN"; card: Card }
  | { tableId: string; type: "DEAL_RIVER"; card: Card }
  | { tableId: string; type: "SHOWDOWN"; revealOrder: string[] }
  | {
      tableId: string;
      type: "PAYOUT";
      potBreakdown: Array<{
        playerId: string;
        amount: number;
        potIndex: number;
      }>;
    }
  | { tableId: string; type: "HAND_END" }
  | { tableId: string; type: "BUTTON_MOVED"; buttonIndex: number }
  | { tableId: string; type: "TIMER"; countdown: number }
  | { tableId: string; type: "ERROR"; code: string; msg: string };

export type ClientCommand =
  | { cmdId: string; type: "ATTACH"; userId: string }
  | {
      cmdId: string;
      type: "SIT";
      tableId: string;
      /** desired seat index */
      seat: number;
      buyIn: number;
    }
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
