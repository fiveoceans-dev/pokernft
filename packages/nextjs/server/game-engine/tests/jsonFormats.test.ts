import { describe, it, expect } from "vitest";
import { tableToJson, tableFromJson } from "../jsonFormats";
import { PlayerState, PlayerAction, TableState, Round, Table } from "../types";

describe("jsonFormats table conversion", () => {
  it("converts Table to JSON and back", () => {
    const table: Table = {
      seats: [
        {
          id: "p1",
          seatIndex: 0,
          stack: 100,
          state: PlayerState.ACTIVE,
          hasButton: false,
          autoPostBlinds: true,
          timebankMs: 0,
          betThisRound: 0,
          totalCommitted: 0,
          holeCards: [],
          lastAction: PlayerAction.NONE,
        },
        null,
      ],
      buttonIndex: 0,
      smallBlindIndex: 0,
      bigBlindIndex: 1,
      smallBlindAmount: 1,
      bigBlindAmount: 2,
      minBuyIn: 20,
      maxBuyIn: 200,
      state: TableState.PRE_FLOP,
      deck: [],
      board: [],
      pots: [],
      currentRound: Round.PREFLOP,
      actingIndex: 0,
      betToCall: 0,
      minRaise: 0,
      lastFullRaise: null,
      actedSinceLastRaise: new Set([0]),
      actionTimer: 0,
      interRoundDelayMs: 0,
      handStartDelayMs: 0,
      dealAnimationDelayMs: 0,
    };

    const json = tableToJson(table);
    expect(json.actedSinceLastRaise).toEqual([0]);

    const rebuilt = tableFromJson(json);
    expect(rebuilt.actedSinceLastRaise).toBeInstanceOf(Set);
    expect(Array.from(rebuilt.actedSinceLastRaise)).toEqual([0]);

    const { actedSinceLastRaise: _, ...rebuiltRest } = rebuilt as any;
    const { actedSinceLastRaise: __, ...originalRest } = table as any;
    expect(rebuiltRest).toEqual(originalRest);
  });
});
