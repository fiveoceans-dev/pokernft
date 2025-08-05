# 🏗 PokerNFTs

## Getting Started

This repository uses **Node 20** and **Yarn 3** workspaces.

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
