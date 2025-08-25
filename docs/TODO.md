# TODO

The following items from the implementation checklist remain unfinished. They
tie back to features discussed across the documents in this directory. See
[action-plan.md](./action-plan.md) for the broader implementation roadmap:

- Deterministic PRNG with logged seed and per-hand hash for audits.
- Log rake taken from pots.
- Comprehensive hand and action logging for replay and tests.
- Unit tests covering:
  - Min-raise reopen scenarios.
  - Side pots with three or more all-ins.
  - Dead-blind returns.
- Enforce turn order with a dedicated manager that advances `actingIndex` and rejects out-of-turn commands.
- Maintain seats as persistent structures to prevent index reshuffling when players join, leave, or sit out.

## Multiplayer Tasks

- Integrate `GameEngine` into the WebSocket server and broadcast engine events.
- Enforce one seat per wallet using `SeatingManager`.
- Emit lifecycle events (`PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_DISCONNECTED`, `PLAYER_REJOINED`).
- Support graceful disconnect and reconnection in `SessionManager`.
- Refactor frontend store to consume WebSocket events instead of a local engine.
- Add integration tests covering connect → seat → action → disconnect → reconnect.
- (Optional) Persist sessions and tables in Redis to survive server restarts.
- Fix failing tests, lint, and type checks to keep baseline green.
