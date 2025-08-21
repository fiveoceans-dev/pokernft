# 🏗 PokerNFTs

## Getting Started

This repository uses **Node 20** and **Yarn 3** workspaces.
For an overview of the directory layout and core backend design, see the
documents in [`docs/`](docs). The key entry points are
[project-structure.md](docs/project-structure.md), which describes the
workspace layout, and [modules.md](docs/modules.md), which outlines the
server modules that drive the poker engine.

```bash
corepack enable
yarn install
```

### Development

Use the development server for instant feedback without rebuilding:

```bash
yarn dev          # run Next.js dev server with hot reload
yarn chain        # launch local Starknet devnet
```

### Smart Contracts

```bash
yarn compile      # compile Cairo contracts
yarn deploy       # deploy to the devnet
```

### Quality

```bash
yarn format:check
yarn next:lint
yarn next:check-types
yarn test:nextjs
yarn test          # snfoundry tests
```

### Deployment

Deployments to Vercel use [`packages/nextjs/vercel.json`](packages/nextjs/vercel.json), which pins the Node version and build command. Trigger a build with:

```bash
yarn vercel
```

Environment variables such as `NEXT_PUBLIC_PROVIDER_URL` configure Starknet RPC endpoints. The app falls back to `NEXT_PUBLIC_DEVNET_PROVIDER_URL` when the primary endpoint is unavailable.

### Documentation

The `docs/` directory holds design notes and workflow descriptions for the
engine and networking layer:

- [action-plan.md](docs/action-plan.md) – numbered roadmap from UI through multiplayer.
- [modules.md](docs/modules.md) – responsibilities of the core server modules.
- [game-states.md](docs/game-states.md) – table state machine and lifecycle.
- [dealing-and-betting.md](docs/dealing-and-betting.md) – card flow and betting rounds.
- [showdown-payouts.md](docs/showdown-payouts.md) – resolving hands and awarding pots.
- [turn-order-and-seating.md](docs/turn-order-and-seating.md) – seat management and acting order.
- [networking-contract.md](docs/networking-contract.md) – WebSocket protocol between clients and the server.
- [multi-player-server.md](docs/multi-player-server.md) – session creation and user identifiers.

These references provide enough detail for a senior developer to implement or
modify the poker backend.
