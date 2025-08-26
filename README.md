# 🎮 PokerNFT - Multiplayer Poker on Starknet

Real-time multiplayer Texas Hold'em poker with Starknet wallet integration.

## 🏗️ Architecture

- 🎮 **Frontend**: Next.js on Vercel (`packages/nextjs/app/`, `components/`, `hooks/`)  
- 🎲 **Game Engine**: Pure TypeScript poker logic (`packages/nextjs/game-engine/`)
- 🔌 **WebSocket Server**: Real-time multiplayer on Heroku (`packages/nextjs/server/`)
- ⛓️ **Smart Contracts**: Cairo contracts for future blockchain integration (`packages/snfoundry/`)

## 🚀 Quick Start

This repository uses **Node 20** and **Yarn 3** workspaces.

```bash
corepack enable
yarn install
```

### Development - Run Both Services

```bash
# Terminal 1: Frontend (Next.js)
cd packages/nextjs
yarn dev                    # http://localhost:3005

# Terminal 2: WebSocket Server  
cd packages/nextjs/server
npm run dev                 # ws://localhost:8080
```

### Single Command Development

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

## 🚀 Deployment

### Frontend → Vercel
```bash
cd packages/nextjs
yarn vercel                 # Deploy frontend to Vercel
```

Set environment variable in Vercel dashboard:
```
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com
```

### WebSocket Server → Heroku
```bash
cd packages/nextjs/server
./heroku-deploy.sh          # Deploy server to Heroku
```

**Complete deployment guide**: [packages/nextjs/server/README.md](packages/nextjs/server/README.md)

### Environment Configuration
- `NEXT_PUBLIC_PROVIDER_URL`: Starknet RPC endpoints
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL for production
- Frontend falls back to `NEXT_PUBLIC_DEVNET_PROVIDER_URL` when primary endpoint unavailable

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

## 🎯 Game Features

- ✅ **Real-time Multiplayer**: WebSocket-based instant updates
- ✅ **Starknet Wallet Integration**: Connect with Starknet wallets
- ✅ **Space-themed Tables**: 2 persistent tables (Andromeda Station, Orion Outpost)  
- ✅ **Game Flow**: 10s countdown → dealing → betting → showdown
- ✅ **Action Timers**: 10s player action timeouts with auto-fold/check
- ✅ **Texas Hold'em**: Complete No Limit Hold'em implementation
- ✅ **Session Management**: Automatic reconnection handling

## 🎲 Project Structure

```
packages/
├── nextjs/                    # Main application
│   ├── app/                   # Next.js 14 app router (Vercel)
│   ├── components/            # React components  
│   ├── hooks/                 # React hooks for game logic
│   ├── game-engine/           # 🎯 Poker game logic (TypeScript)
│   │   ├── gameEngine.ts      # Core game engine
│   │   ├── handEvaluator.ts   # Hand evaluation
│   │   ├── room.ts            # Game room management
│   │   └── types.ts           # Game types
│   ├── server/                # 🚀 WebSocket server (Heroku)
│   │   ├── src/
│   │   │   ├── index.ts       # Server entry point
│   │   │   ├── lobby.ts       # Table management
│   │   │   └── sessionManager.ts # Session handling
│   │   ├── Procfile           # Heroku configuration
│   │   └── README.md          # Deployment guide
│   └── blockchain/            # 🔮 Future: Blockchain integration layer
└── snfoundry/                 # 🔗 Smart contracts (Cairo)
    ├── contracts/             # Starknet contracts
    └── scripts/               # Deployment scripts
```

## 🔮 Future Blockchain Integration

**Current**: Pure TypeScript implementation in `game-engine/`  
**Future**: Gradual migration to Starknet smart contracts

### Migration Path
1. **Phase 1**: Keep current game logic, add smart contract interfaces
2. **Phase 2**: Replace critical components (hand evaluation, RNG) with on-chain calls
3. **Phase 3**: Full on-chain game state with provable randomness and card secrecy

### Planned Features
- 🔐 **Provable Fairness**: On-chain hand evaluation
- 🎲 **VRF Randomness**: Verifiable random card dealing  
- 🃏 **Card Secrecy**: Mental poker protocols in Cairo
- 💰 **On-chain Payouts**: Smart contract pot distribution
