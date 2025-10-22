# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project context
- Monorepo managed with Yarn 3 workspaces (Node 18+). Root workspaces: packages/snfoundry, packages/nextjs.
- Current, working implementation lives under packages/nextjs (Next.js frontend + embedded ws server). Target architecture is being migrated to clearer apps/* and packages/* modules (see docs/architecture/README.md).

Common commands
- Install deps (root)
  - yarn install

- Dev (recommended hybrid)
  - Backend via Docker (ws server + Redis): docker-compose up -d
  - Frontend (Next.js, port 3005): yarn dev

- Dev (manual, without Docker)
  - WebSocket server: cd packages/nextjs/server && yarn dev   # ws://localhost:8080
  - Frontend: cd packages/nextjs && yarn dev                  # http://localhost:3005

- Build/Run (frontend)
  - Build: yarn build
  - Start: yarn start

- Type check / Format
  - Type check (Next.js workspace): yarn next:check-types
  - Format (write): yarn format
  - Format (check): yarn format:check

- Contracts (Starknet, from root)
  - Local devnet: yarn chain
  - Compile: yarn compile
  - Deploy (reset): yarn deploy
  - Deploy (no reset): yarn deploy:no-reset

- Tests
  - Server (Vitest, in ws server directory):
    - Run all: cd packages/nextjs/server && yarn test
    - Single file: cd packages/nextjs/server && yarn test -- run test/rules/betting.test.ts
    - Single test by name: cd packages/nextjs/server && yarn test -- -t "all-in"
  - Frontend: Vitest config exists (packages/nextjs/vitest.config.ts) but there is no test script or vitest dependency in packages/nextjs. See “Notable gaps” below.

- Docker services (local)
  - Start: docker-compose up -d
  - Services:
    - pokernft-server (ws server) on 8080
    - redis on 6379
    - redis-commander (optional) on 8081 via profile: docker-compose --profile debug up -d

Architecture overview
- Current topology (working today)
  - Frontend: Next.js app (packages/nextjs/app, components, hooks)
  - Game engine: TypeScript logic colocated under packages/nextjs; aliased in vitest config for frontend to game-engine.ts
  - WebSocket server: Node/ts (packages/nextjs/server). Uses Redis for session/game state. Provides real-time table updates over ws://localhost:8080
  - Contracts: Cairo (packages/snfoundry) for planned blockchain integration

- Data flow
  - Client (Next.js) ↔ WebSocket server (packages/nextjs/server) ↔ In-memory/Redis state
  - Engine contains deterministic rules for dealing, betting, timeouts, showdown; server orchestrates rooms/tables and broadcasts events

- Key paths and responsibilities
  - packages/nextjs/app: UI (App Router)
  - packages/nextjs/server: WebSocket server, room/lobby/session management; Vitest tests in server/test/**
  - packages/nextjs/vitest.config.ts: JSDOM test config for UI; aliased engine imports
  - docker-compose.yml: Local services for ws server + Redis
  - docs/: Operational docs (local dev, deployments, integration, testing). See Testing Guide and Integration Guide for end-to-end flows

- Target architecture (in migration; see docs/architecture/README.md)
  - packages/engine: Pure domain engine (deterministic reducer + EventEngine). Ports for RNG, timers, persistence, broadcast
  - packages/protocol: Shared types/schemas (ClientCommand/ServerEvent) with versioning
  - packages/client-sdk: Browser-friendly WS client wrapper using @pokernft/protocol
  - apps/ws-server: Standalone Node WS server adapting engine to network
  - apps/web: Frontend consuming @pokernft/client-sdk and @pokernft/protocol
  - Current apps/* and packages/{engine,protocol,client-sdk} are placeholders awaiting extraction from packages/nextjs/*

Environment configuration
- Frontend
  - NEXT_PUBLIC_WS_URL: ws server URL for prod
  - NEXT_PUBLIC_PROVIDER_URL: Starknet RPC endpoint (prod)
  - NEXT_PUBLIC_DEVNET_PROVIDER_URL: fallback during development
- Docker compose sets ws server env (PORT=8080, REDIS_URL, ALLOWED_ORIGINS) and starts Redis

Notable gaps / inconsistencies (for future improvement)
- Linting: README mentions “yarn next:lint” but there is no such root script nor a lint script in packages/nextjs. Consider adding to packages/nextjs:
  - "lint": "next lint"
  - And to root: "next:lint": "yarn workspace @ss-2/nextjs lint"
- Frontend tests: packages/nextjs has a Vitest config and tests (e.g., app/lobby/page.test.tsx) but no vitest devDependency or test script. Consider adding to packages/nextjs:
  - devDependency: "vitest"
  - script: "test": "vitest"
  - Then you can run: yarn workspace @ss-2/nextjs test or single test with: yarn workspace @ss-2/nextjs test -- run app/lobby/page.test.tsx -t "renders lobby"
- Workspaces: packages/nextjs/server is not its own Yarn workspace. That’s fine operationally, but if you prefer workspace-level commands for the server, add it as a workspace and wire scripts accordingly.
