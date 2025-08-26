# 🛠️ Local Development Guide

Complete guide to setting up and running the PokerNFT project locally. Uses hybrid approach: Docker for backend services, native Next.js for frontend (aligns with Vercel + Heroku deployment).

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
  ```bash
  # Check version
  node --version
  ```

- **Yarn** (package manager)
  ```bash
  # Install globally
  npm install -g yarn
  
  # Check version
  yarn --version
  ```

- **Docker & Docker Compose** (for containerized development)
  ```bash
  # Install from: https://docs.docker.com/get-docker/
  
  # Check versions
  docker --version
  docker-compose --version
  ```

- **Git** (version control)
  ```bash
  git --version
  ```

## 🚀 Quick Start

### Hybrid Development (Recommended)

This approach mirrors your production setup: Docker backend + native frontend.

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/pokernft.git
   cd pokernft
   ```

2. **Start backend services with Docker**
   ```bash
   # From project root
   docker-compose up -d
   ```
   
   This will start:
   - ✅ WebSocket server on `ws://localhost:8080`
   - ✅ Redis database on `localhost:6379`
   - ✅ Redis Commander UI on `http://localhost:8081` (optional)

3. **Start the frontend natively**
   ```bash
   # In a new terminal
   cd packages/nextjs
   yarn install
   yarn dev
   ```
   
   Frontend will be available at `http://localhost:3005`

### Manual Development Setup (Alternative)

If you prefer running services manually without Docker:

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-org/pokernft.git
   cd pokernft
   yarn install
   ```

2. **Set up environment variables**
   ```bash
   # Backend server
   cd packages/nextjs/server
   cp .env.example .env.local
   
   # Frontend (already has .env with WebSocket URL)
   cd ../
   # Check that NEXT_PUBLIC_WS_URL=ws://localhost:8080 is set in .env
   ```

3. **Start Redis (optional but recommended)**
   ```bash
   # Using Docker
   docker run --name redis -p 6379:6379 -d redis:7-alpine
   
   # Or install locally: https://redis.io/docs/getting-started/installation/
   ```

4. **Start the WebSocket server**
   ```bash
   cd packages/nextjs/server
   yarn install
   yarn dev
   ```
   Server will start on `ws://localhost:8080`

5. **Start the frontend**
   ```bash
   # In a new terminal
   cd packages/nextjs
   yarn dev
   ```
   Frontend will start on `http://localhost:3005`

## 🏗️ Project Structure

```
pokernft/
├── packages/
│   ├── nextjs/                 # Frontend (Next.js)
│   │   ├── app/               # Next.js app router pages
│   │   ├── components/        # React components
│   │   ├── game-engine/       # Poker game logic
│   │   ├── hooks/            # React hooks
│   │   ├── server/           # WebSocket server
│   │   │   ├── src/          # Server source code
│   │   │   ├── Dockerfile    # Container configuration
│   │   │   └── docker-compose.yml  # Local development
│   │   └── styles/           # CSS styles
│   └── snfoundry/            # Smart contracts (Cairo)
├── docs/                     # Documentation
└── docker-compose.yml       # Full-stack development
```

## 🔧 Environment Configuration

### Backend Server (.env.local)

```bash
# Copy from template
cd packages/nextjs/server
cp .env.example .env.local
```

Key variables to customize:
- `PORT=8080` - Server port
- `REDIS_URL=redis://localhost:6379` - Redis connection
- `ALLOWED_ORIGINS=http://localhost:3005` - CORS settings (frontend port)

### Frontend (.env.local)

```bash
# Copy from template
cd packages/nextjs
cp .env.example .env.local
```

Key variables to customize:
- `NEXT_PUBLIC_WS_URL=ws://localhost:8080` - WebSocket server URL
- `NEXT_PUBLIC_PROVIDER_URL=http://127.0.0.1:5050` - Starknet provider

## 🎮 Development Workflow

### 1. Start Services

**Full Docker Setup:**
```bash
# From project root
docker-compose up -d  # Detached mode
```

**Manual Setup:**
```bash
# Terminal 1: Redis (optional)
docker run --name redis -p 6379:6379 -d redis:7-alpine

# Terminal 2: WebSocket Server
cd packages/nextjs/server
yarn dev

# Terminal 3: Frontend
cd packages/nextjs
yarn dev
```

### 2. Access Applications

- **Frontend:** http://localhost:3005
- **WebSocket Server:** ws://localhost:8080
- **Redis Commander:** http://localhost:8081 (user: admin, pass: admin)

### 3. Development Commands

**Backend Server:**
```bash
cd packages/nextjs/server

yarn dev        # Start with hot reload
yarn build      # Build TypeScript
yarn start      # Run built version
yarn test       # Run tests
```

**Frontend:**
```bash
cd packages/nextjs

yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Run built version
yarn test         # Run tests
yarn lint         # Check code quality
yarn format       # Format code
```

**Smart Contracts:**
```bash
cd packages/snfoundry

yarn chain       # Start local Starknet node
yarn compile     # Compile contracts
yarn deploy      # Deploy to local node
yarn test        # Run contract tests
```

### 4. Testing the Connection

**Test WebSocket Connection:**
```bash
# Install wscat globally
npm install -g wscat

# Connect to local server
wscat -c ws://localhost:8080

# Send test command
> {"cmdId":"test","type":"LIST_TABLES"}
```

**Test Frontend Connection:**
1. Open http://localhost:3005
2. Navigate to the lobby page at http://localhost:3005/lobby
3. Check browser console for WebSocket connection logs
4. Try joining a table

## 🐳 Docker Development

### Current Setup (Hybrid - Recommended)

The root-level `docker-compose.yml` only runs backend services:

```yaml
# Backend services only - Frontend runs natively
version: '3.8'
services:
  pokernft-server:
    build: ./packages/nextjs/server
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

This aligns with production deployment (Vercel frontend + Heroku backend).

### Optional: Full Docker Development

For developers who prefer full containerization, you can extend the docker-compose.yml to include the frontend service using the provided `Dockerfile.dev`.

### Useful Docker Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f server

# Restart a specific service
docker-compose restart server

# Rebuild and restart
docker-compose up --build server

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔍 Debugging & Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port
lsof -i :8080
lsof -i :3005

# Kill process
kill -9 <PID>
```

**WebSocket Connection Failed:**
- ✅ Check server is running on port 8080
- ✅ Verify `NEXT_PUBLIC_WS_URL` in frontend .env
- ✅ Check browser console for CORS errors
- ✅ Ensure firewall allows WebSocket connections

**Redis Connection Issues:**
```bash
# Check Redis is running
docker ps | grep redis

# Connect to Redis CLI
docker exec -it redis redis-cli

# Test connection
> ping
PONG
```

**TypeScript Compilation Errors:**
```bash
# Clear TypeScript cache
cd packages/nextjs/server
rm -rf dist/
yarn build

# Check for type errors
yarn type-check
```

### Debug Mode

**Enable debug logging:**
```bash
# Backend
export DEBUG=pokernft:*
yarn dev

# Frontend
NEXT_PUBLIC_DEBUG=true yarn dev
```

**View Redis data:**
- Open http://localhost:8081
- Login with admin/admin
- Browse game state and sessions

### Hot Reload Issues

**Frontend not reloading:**
```bash
# Clear Next.js cache
rm -rf .next/
yarn dev
```

**Server not reloading:**
```bash
# Restart ts-node
yarn dev
```

## 📚 Development Resources

### Game Testing

**Create Test Users:**
1. Open multiple browser tabs/windows
2. Each tab gets a unique session
3. Sit players at the same table
4. Test multiplayer functionality

**Test Game Flow:**
1. Join a table with 2+ players
2. Wait for 10-second countdown
3. Test betting actions (fold, call, raise)
4. Complete a full hand to showdown

### Code Quality

**Pre-commit Hooks:**
```bash
# Install husky
yarn prepare

# Run linting
yarn lint

# Fix formatting
yarn format
```

**Type Checking:**
```bash
yarn type-check
```

## 🆘 Getting Help

### Log Files

**Server logs:**
```bash
cd packages/nextjs/server
tail -f logs/server.log
```

**Frontend logs:**
- Check browser console (F12)
- Check terminal running `yarn dev`

### Health Checks

**Server health:**
```bash
curl http://localhost:8080/health
```

**Database health:**
```bash
# Redis
docker exec redis redis-cli ping
```

### Support

If you encounter issues:

1. **Check this documentation** for common solutions
2. **Review error logs** in browser console and terminal
3. **Test individual components** (server, frontend, Redis)
4. **Create an issue** with reproduction steps and logs

---

Happy coding! 🚀