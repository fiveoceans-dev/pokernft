import { describe, expect, test } from "vitest";
import { AuditLogger } from "../auditLogger";
import { PlayerAction, Round } from "../types";

describe("AuditLogger", () => {
  test("records actions with elapsed time", () => {
    const audit = new AuditLogger();
    audit.startHand("seed");
    audit.record("p1", Round.PREFLOP, PlayerAction.BET, 50);
    const actions = audit.handActions;
    expect(actions.length).toBe(1);
    expect(actions[0]).toMatchObject({
      playerId: "p1",
      round: Round.PREFLOP,
      action: PlayerAction.BET,
      amount: 50,
    });
    expect(actions[0].elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
