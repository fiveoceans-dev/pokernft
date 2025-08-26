# PokerNFT WebSocket Server

Real-time multiplayer server for poker game connections. This server handles WebSocket connections, game state management, and table orchestration.

## 🏗️ Architecture

```
server/
├── src/                          # Server source code
│   ├── index.ts                  # WebSocket server entry point
│   ├── lobby.ts                  # Table management & listing
│   ├── sessionManager.ts         # User session handling
│   ├── persistence.ts            # Redis/memory state persistence
│   ├── user.ts                   # User management utilities
│   └── utils.ts                  # Server utilities
├── dist/                         # Compiled JavaScript output
├── tests/                        # Integration tests
├── Procfile                      # Heroku process definition
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── heroku-deploy.sh             # Deployment script
└── README.md                     # This file
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Redis (optional, for persistence)

### Setup
```bash
# Navigate to server directory
cd packages/nextjs/server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

Server will start on `ws://localhost:8080`

### Available Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Run compiled server (production)
npm test         # Run integration tests
```

## 🌐 Heroku Deployment

### One-time Setup

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Other platforms: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-poker-server-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production -a your-poker-server-name
   heroku config:set ALLOWED_ORIGINS=https://your-frontend.vercel.app -a your-poker-server-name
   ```

4. **Add Redis (Optional)**
   ```bash
   heroku addons:create heroku-redis:mini -a your-poker-server-name
   ```

### Deploy to Heroku

**Option 1: Using Deployment Script**
```bash
cd packages/nextjs/server
./heroku-deploy.sh
```

**Option 2: Manual Git Subtree**
```bash
# From repository root
cd ../../..  # Go to repo root
git subtree push --prefix=packages/nextjs/server heroku main
```

### Post-Deployment

1. **Check Server Status**
   ```bash
   heroku logs --tail -a your-poker-server-name
   heroku ps -a your-poker-server-name
   ```

2. **Test WebSocket Connection**
   ```bash
   # Your server will be available at:
   wss://your-poker-server-name.herokuapp.com
   ```

## 🔧 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `8080` | Auto-set by Heroku |
| `NODE_ENV` | Environment | `development` | ✅ |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | Optional |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3005` | Recommended |

## 🎮 Game Features

- **Real-time Multiplayer**: WebSocket connections for instant updates
- **Persistent Tables**: 2 space-themed tables always available
- **Game Countdown**: 10-second start countdown with 2+ players  
- **Action Timer**: 10-second player action timeouts
- **Session Management**: Automatic reconnection handling
- **State Persistence**: Redis-backed game state (optional)

### Persistent Tables
- **🌌 Andromeda Station**: $25/$50 blinds
- **🚀 Orion Outpost**: $50/$100 blinds

## 📡 WebSocket API

### Client Commands
```typescript
// List available tables
{ cmdId: "uuid", type: "LIST_TABLES" }

// Join a table seat
{ cmdId: "uuid", type: "SIT", tableId: "andromeda", seat: 0, buyIn: 10000 }

// Player action
{ cmdId: "uuid", type: "ACTION", action: "FOLD" | "CALL" | "RAISE", amount?: number }

// Leave table
{ cmdId: "uuid", type: "LEAVE" }
```

### Server Events
```typescript
// Session established
{ type: "SESSION", sessionId: string, userId?: string }

// Table list response
{ type: "TABLE_LIST", tables: LobbyTable[] }

// Game state update
{ type: "TABLE_SNAPSHOT", table: GameRoom }

// Player joined
{ type: "PLAYER_JOINED", seat: number, playerId: string }

// Hand started
{ type: "HAND_START" }

// Action required
{ type: "ACTION_PROMPT", actingIndex: number, betToCall: number }

// Game countdown
{ type: "GAME_START_COUNTDOWN", countdown: number }
```

## 🔗 Frontend Integration

### Environment Setup
In your Vercel frontend, set:
```env
NEXT_PUBLIC_WS_URL=wss://your-poker-server-name.herokuapp.com
```

### Connection Code
```typescript
const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080');
ws.onopen = () => {
  ws.send(JSON.stringify({ cmdId: Date.now().toString(), type: "LIST_TABLES" }));
};
```

## 🧪 Testing

### Manual Testing
```bash
# Install wscat globally
npm install -g wscat

# Connect to local server
wscat -c ws://localhost:8080

# Send commands
> {"cmdId":"test","type":"LIST_TABLES"}
```

### Integration Tests
```bash
npm test
```

## 🚨 Troubleshooting

### Common Issues

**Server won't start locally**
```bash
# Check if port 8080 is in use
lsof -i :8080
kill -9 <PID>
```

**Heroku deployment fails**
```bash
# Check build logs
heroku logs --tail -a your-app-name

# Common fix: ensure you're deploying from repo root
cd ../../..
git subtree push --prefix=packages/nextjs/server heroku main
```

**WebSocket connection fails**
- Verify `ALLOWED_ORIGINS` environment variable
- Check Heroku app is running: `heroku ps -a your-app-name`
- Ensure using `wss://` (not `ws://`) for Heroku

**Empty lobby in frontend**
- Server may be sleeping (Heroku free tier)
- Check WebSocket URL in frontend environment variables
- Verify tables are created: check server logs

## 📈 Scaling & Performance

### Heroku Dyno Types
- **Free**: Good for development, sleeps after 30min
- **Hobby ($7/month)**: Always-on, custom domain support
- **Standard**: Better performance, metrics

### Redis Configuration
```bash
# For production, use dedicated Redis
heroku addons:create heroku-redis:premium-0 -a your-app-name
```

## 🔮 Future Blockchain Integration

This server is designed to integrate with Starknet smart contracts:

- **Current**: JavaScript game logic in `../../game-engine/`
- **Future**: Smart contract calls via `src/blockchain/` modules
- **Migration**: Gradual replacement of game logic with on-chain calls

## 📚 Related Documentation

- [Frontend Vercel Deployment](../../../docs/vercel-deployment.md)
- [Game Engine Documentation](../game-engine/README.md)
- [Smart Contracts](../../../snfoundry/README.md)

---

## 🆘 Support

Having issues? Check:
1. Server logs: `heroku logs --tail -a your-app-name`
2. Network connectivity: Test with `wscat`
3. Environment variables: `heroku config -a your-app-name`

**Need help?** Open an issue with:
- Server logs
- Browser console errors
- Steps to reproduce