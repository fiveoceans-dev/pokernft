import { describe, it, expect } from "vitest";
import { validateAction } from "./validation";
import { Table } from "../core/types";

describe("minimum raise calculation", () => {
  function createTable(): Table {
    return {
      id: "t1",
      seats: [
        {
          id: 0,
          pid: "A",
          chips: 1000,
          committed: 40,
          streetCommitted: 40,
          status: "active",
        },
        {
          id: 1,
          pid: "B",
          chips: 1000,
          committed: 10,
          streetCommitted: 10,
          status: "active",
        },
      ],
      button: 0,
      smallBlind: 5,
      bigBlind: 10,
      phase: "preflop",
      street: "preflop",
      actor: 1,
      lastAggressor: 0,
      currentBet: 40,
      lastRaiseSize: 30,
      pots: [],
      communityCards: [],
      blinds: { sb: 5, bb: 10 },
      handNumber: 1,
      timestamp: Date.now(),
    };
  }

  it("rejects raises below last raise size", () => {
    const table = createTable();
    const result = validateAction(table, 1, "raise", 25);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum raise is $30");
  });

  it("accepts raises meeting last raise size", () => {
    const table = createTable();
    const result = validateAction(table, 1, "raise", 30);
    expect(result.valid).toBe(true);
  });
});
