import { describe, expect, test } from "vitest";
import { EventBus } from "../eventBus";
import type { ServerEvent, ClientCommand } from "../networking";

describe("EventBus", () => {
  test("queues commands and emits events", () => {
    const bus = new EventBus();
    const received: ServerEvent[] = [];
    bus.onEvent((e) => received.push(e));

    const ev: ServerEvent = { tableId: "t1", type: "HAND_START" };
    bus.emit(ev);
    expect(received).toEqual([ev]);

    const cmd: ClientCommand = {
      cmdId: "1",
      type: "SIT",
      tableId: "t1",
      seat: 0,
      buyIn: 100,
    };
    bus.enqueueCommand(cmd);
    expect(bus.pendingCommands).toBe(1);
    expect(bus.dequeueCommand()).toEqual(cmd);
    expect(bus.dequeueCommand()).toBeUndefined();
  });
});
