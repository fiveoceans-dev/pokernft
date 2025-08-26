import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { applyActionFromJson } from "../bettingEngine";
import { isBettingRoundComplete } from "../bettingEngine";
import { tableFromJson } from "../jsonFormats";
import type { BettingActionRequest } from "../jsonFormats";

describe("BettingEngine JSON interface", () => {
  it("processes actions from JSON state", () => {
    const file = path.join(__dirname, "data", "bettingEngine.json");
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw) as {
      table: BettingActionRequest["table"];
      actions: { seatIndex: number; action: { type: any; amount?: number } }[];
      expected: { actingIndex: number | null };
    };

    let jsonTable = data.table;
    for (const step of data.actions) {
      const res = applyActionFromJson({
        table: jsonTable,
        seatIndex: step.seatIndex,
        action: step.action,
      });
      jsonTable = res.table;
    }
    const finalTable = tableFromJson(jsonTable);
    expect(finalTable.actingIndex).toBe(data.expected.actingIndex);
    expect(isBettingRoundComplete(finalTable)).toBe(true);
  });
});
