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
- Implement session management that assigns a Starknet-style public address per connection and enforces one user per session.
