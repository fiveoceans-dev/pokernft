# ADR-001: Architecture Realignment (Engine, Server, Frontend)

Date: 2025-09-10

Status: Proposed

## Context

- Current repo houses a Next.js app under `packages/nextjs`, with a colocated WebSocket server and the poker game engine under `packages/nextjs/server`.
- The game engine follows an event-sourced FSM with a pure reducer and side effects. The WS server bridges client commands to engine events and forwards state changes.
- Frontend communicates directly via bare `WebSocket`, with local stores managing commands and server events.

This coupling makes reuse, testing, and deployment flexibility harder. We want clearer module boundaries, shared typed protocol, and multi-target deployment (dev, staging, prod).

## Decision

Adopt a modular monorepo with clear domain boundaries (Hexagonal/Ports & Adapters):

1) packages/engine
   - Pure domain engine: deterministic reducer, event log, side effects described as intents.
   - Dependencies: none (node/browser compatible). RNG, timers, persistence, and broadcasting are ports (interfaces) injected by adapters.
   - Public API: `EventEngine`, `reduce(table, event)`, types, and pure helpers.

2) packages/protocol
   - Versioned `ClientCommand` and `ServerEvent` schemas (zod), and shared domain types.
   - JSON wire format and codec functions. Enables validation at server ingress and client parse.

3) packages/client-sdk
   - Browser-side SDK that wraps WebSocket connection lifecycle with typed send/receive, heartbeats, reconnection, offline queue, and backoff.
   - Surface an event emitter and command methods; no React dependency.

4) apps/ws-server
   - Node WS service. Adapters for: timers, RNG, persistence, and broadcasting.
   - Bridges `ClientCommand` -> domain events; forwards domain `ServerEvent` to clients.
   - Optional persistence via in-memory event store + periodic snapshots (plug: Redis/DB later).

5) apps/web (Next.js)
   - UI and UX only. Imports `@pokernft/protocol` types and uses `@pokernft/client-sdk` to interact with the WS.
   - Server components fetch lobby via HTTP from ws-server; client components subscribe to live table streams.

## Rationale

- Testability: Engine becomes a pure package with focused tests and reproducible simulations.
- Reuse: Same engine runs in sim tools, bots, or headless tournaments without UI.
- Safety: A typed, versioned protocol reduces runtime errors and enables backward-compatible changes.
- Deployment: Independent scaling of ws-server and web; swap transports or persistence without touching the engine.
- Performance: Backpressure and deterministic event queue remain in the engine, while ws-server manages IO.

## Target Folder Structure

```
packages/
  engine/
    src/...
    tests/...
  protocol/
    src/commands.ts, events.ts, schemas.ts
  client-sdk/
    src/index.ts
apps/
  ws-server/
    src/index.ts, adapters/*
  web/
    (moved from packages/nextjs)
```

Initial migration can keep `apps/web` pointing to the current Next.js code until we physically move directories.

## Module Boundaries & Ports

- RNGPort: `next(seed) -> number` and `shuffle(deck) -> deck`. Default: seeded PRNG; alt: crypto.
- TimerPort: `start(playerId, ms)`, `clear(id)`, `clearAll()`. Default: Node timers; alt: distributed scheduler.
- PersistencePort: `append(tableId, event)`, `snapshot(tableId, state)`, `load(tableId) -> {state, events}`.
- BroadcasterPort: `emit(tableId, event)` (ws-server implements via WebSocket broadcast).

## Protocol (v1)

- ClientCommand: `LIST_TABLES | JOIN_TABLE | ATTACH/REATTACH | TAKE_SEAT | LEAVE_SEAT | ACTION | START_HAND`.
- ServerEvent: `SESSION | TABLE_LIST | TABLE_SNAPSHOT | PLAYER_JOINED | PLAYER_LEFT | ACTION_REQUIRED | COUNTDOWN | ERROR`.
- All messages validated against zod schemas; include `tableId`, `version`, `corrId` where applicable.

## Migration Plan

Phase 1: Foundations
- Create `packages/protocol` with extracted types and zod schemas (mirror current `server/game-engine` types).
- Add `packages/client-sdk` that wraps WebSocket and exposes typed send/receive.

Phase 2: Engine Extraction
- Create `packages/engine`; copy `packages/nextjs/server/game-engine` into it and adjust imports to remain pure.
- Keep a compatibility layer in `packages/nextjs` temporarily: re-export from `@pokernft/engine`.

Phase 3: ws-server App
- Move `packages/nextjs/server` to `apps/ws-server`; refactor imports to `@pokernft/engine` and `@pokernft/protocol`.
- Keep HTTP endpoints for health and tables; add protocol validation at ingress.

Phase 4: Frontend Integration
- Replace bare `WebSocket` usage with `@pokernft/client-sdk` inside `useGameStore`.
- Import shared types from `@pokernft/protocol` instead of local bridges.

Phase 5: Optional Enhancements
- Persistence adapter (file/Redis) with periodic snapshots.
- Worker-based engine host: run `EventEngine` per table in worker threads for isolation.
- Observability: add structured logs (pino) and metrics hooks.

## Risks & Mitigations

- Refactor scope: Address incrementally; compatibility re-exports keep web working during extraction.
- Type drift: Introduce `protocol` first to lock schemas; then flip imports progressively.
- Deployment changes: New ws-server app; document env vars and scripts; keep Docker support.

## Consequences

- Clear ownership and separation of concerns.
- Easier scaling and future features (tournaments, replays, bots).

## Alternatives Considered

- Keep colocated structure: simpler to start but harder to maintain/scale.
- gRPC instead of WebSocket: heavier for browser; can consider for internal services later.

