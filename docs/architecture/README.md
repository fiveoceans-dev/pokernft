# Architecture Overview (Target)

- Core domain engine is a pure package (`packages/engine`), exposing a deterministic reducer and an event-driven `EventEngine` with side effects expressed as intents.
- WebSocket server (`apps/ws-server`) adapts the engine to the network, validating commands via `@pokernft/protocol` and broadcasting typed events.
- Frontend (`apps/web`) uses a lightweight `@pokernft/client-sdk` to talk to the ws-server. All message types are shared via `@pokernft/protocol`.
- Ports (RNG, timers, persistence, broadcast) keep the engine decoupled from platform details.

See ADR-001 for the full rationale and migration plan.

## Initial Task List

- Extract shared protocol types/schemas → `packages/protocol`.
- Wrap WebSocket client → `packages/client-sdk`.
- Extract engine → `packages/engine` (copy from `packages/nextjs/server/game-engine`).
- Move WS server → `apps/ws-server` (from `packages/nextjs/server`).
- Update frontend imports to use protocol + client-sdk.

## Non-Goals (for now)

- Changing business rules or table logic.
- Adding DB/Redis persistence (define port, add simple in-memory). 
- Multi-process clustering (document design; add later).
