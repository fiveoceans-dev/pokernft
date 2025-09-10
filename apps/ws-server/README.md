# apps/ws-server (Planned)

Standalone Node WebSocket server hosting the @pokernft/engine instances per table.

- Validates `ClientCommand` via `@pokernft/protocol`
- Bridges to engine and broadcasts `ServerEvent`
- Adapters: timers, RNG, persistence (in-memory initially)

This is a placeholder until migration from `packages/nextjs/server`.

