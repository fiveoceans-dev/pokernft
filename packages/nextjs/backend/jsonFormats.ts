import type { Card, PlayerAction, Table } from "./types";

export interface HandEvaluatorRequest {
  cards: Card[];
}

export interface HandEvaluatorResponse {
  rankValue: number;
  bestCards: Card[];
}

export interface JsonTable extends Omit<Table, "actedSinceLastRaise"> {
  actedSinceLastRaise: number[];
}

export interface BettingActionRequest {
  table: JsonTable;
  seatIndex: number;
  action: { type: PlayerAction; amount?: number };
}

export interface BettingActionResponse {
  actingIndex: number | null;
  table: JsonTable;
}

export function tableFromJson(json: JsonTable): Table {
  return { ...json, actedSinceLastRaise: new Set(json.actedSinceLastRaise) };
}

export function tableToJson(table: Table): JsonTable {
  return {
    ...table,
    actedSinceLastRaise: Array.from(table.actedSinceLastRaise),
  };
}
