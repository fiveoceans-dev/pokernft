# 🧪 Testing Guide

Complete testing procedures for PokerNFT essential workflow validation.

## 🎯 Testing Overview

This guide covers testing the complete poker game flow from development to production deployment. Tests are organized by component and complexity.

## 📋 Pre-Testing Setup

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ and Yarn
- wscat for WebSocket testing: `npm install -g wscat`

### Environment Setup
```bash
# Clone and setup project
git clone https://github.com/your-org/pokernft.git
cd pokernft

# Start backend services
docker-compose up -d

# Start frontend
cd packages/nextjs
yarn install
yarn dev
```

## 🔧 Component Testing

### 1. Backend Server Testing

**Start WebSocket Server:**
```bash
cd packages/nextjs/server
yarn dev
# Should see: "WebSocket server running on ws://localhost:8080"
```

**Test WebSocket Connection:**
```bash
# Connect to server
wscat -c ws://localhost:8080

# Should receive session event
< {"tableId":"","type":"SESSION","sessionId":"...","userId":null}
```

**Test Game Commands:**
```bash
# List available tables
> {"cmdId":"test1","type":"LIST_TABLES"}
< {"tableId":"","type":"TABLE_LIST","tables":[...]}

# Expected: 2 persistent tables (Andromeda Station, Orion Outpost)
```

**Verify Game Engine:**
```bash
# Run game engine tests
cd packages/nextjs/game-engine
yarn test

# Should pass all poker logic tests
```

### 2. Frontend Testing

**Start Frontend:**
```bash
cd packages/nextjs
yarn dev
# Should start on http://localhost:3005
```

**Test Pages:**
1. **Home Page:** http://localhost:3005
   - ✅ Page loads without errors
   - ✅ Navigation works

2. **Lobby Page:** http://localhost:3005/lobby
   - ✅ WebSocket connects to backend
   - ✅ Tables list populates
   - ✅ No console errors

3. **Play Page:** http://localhost:3005/play
   - ✅ Game interface loads
   - ✅ WebSocket connection established

**Check Browser Console:**
```javascript
// Should see WebSocket connection logs
// No errors about missing environment variables
```

### 3. Integration Testing

**Full Stack Connection Test:**
1. Start backend: `docker-compose up -d`
2. Start frontend: `yarn dev`
3. Open http://localhost:3005/lobby
4. Verify tables appear in lobby
5. Click on a table to join

**Environment Variables Test:**
```bash
# Check frontend uses environment variables
grep -r "localhost:8080" packages/nextjs/
# Should only find fallback values, not hardcoded usage

# Check environment variable is loaded
echo $NEXT_PUBLIC_WS_URL  # or check in browser dev tools
```

## 🎮 End-to-End Game Flow Testing

### Single Player Flow

1. **Join Table:**
   - Navigate to lobby: http://localhost:3005/lobby
   - Click "Join" on any table
   - Select seat and enter buy-in amount
   - ✅ Player appears at table

2. **Verify Game State:**
   - Check player chips are correct
   - Verify seat assignment
   - Confirm waiting for more players

### Multi-Player Game Flow

**Setup Multiple Sessions:**
```bash
# Method 1: Multiple browser tabs/windows
# Method 2: Incognito mode
# Method 3: Different browsers
```

**Complete Game Test:**

1. **Player Setup (2+ players required):**
   ```bash
   # Player 1: Regular browser
   # Player 2: Incognito tab
   # Both navigate to lobby and join same table
   ```

2. **Game Start Sequence:**
   - ✅ Countdown starts when 2+ players join
   - ✅ "Game starting in 10..." message appears
   - ✅ Hand starts after countdown
   - ✅ Hole cards dealt to players
   - ✅ Blinds posted automatically

3. **Betting Rounds:**
   ```
   PREFLOP:
   - ✅ Action prompt shows for first player
   - ✅ Action buttons available (fold/call/raise)
   - ✅ Timer countdown works
   - ✅ Actions apply correctly
   - ✅ Turn passes to next player
   
   FLOP:
   - ✅ Community cards appear (3 cards)
   - ✅ Betting round continues
   
   TURN:
   - ✅ 4th community card appears
   - ✅ Betting continues
   
   RIVER:
   - ✅ 5th community card appears  
   - ✅ Final betting round
   
   SHOWDOWN:
   - ✅ Best hands revealed
   - ✅ Winner determined
   - ✅ Chips distributed correctly
   ```

4. **Game Continuation:**
   - ✅ New hand starts automatically
   - ✅ Button rotates
   - ✅ Blinds rotate correctly

### Action Testing Checklist

**Player Actions:**
- [ ] **Fold:** Player cards hidden, excluded from pot
- [ ] **Check:** No bet, action passes to next player  
- [ ] **Call:** Match current bet, action continues
- [ ] **Raise:** Increase bet, resets action to other players
- [ ] **All-In:** Commit all chips, create side pot if needed

**Error Handling:**
- [ ] Invalid actions rejected (e.g., raise below minimum)
- [ ] Out-of-turn actions ignored
- [ ] Connection drops handled gracefully
- [ ] Reconnection restores game state

### Reconnection Testing

1. **Disconnect Test:**
   - Join a game as Player 1
   - Close browser/tab during active hand
   - Reopen and navigate back to table
   - ✅ Game state restored
   - ✅ Player can continue playing

2. **Session Recovery:**
   - Server restart during game
   - Players should be able to reconnect
   - Game state should persist (if Redis enabled)

## 🚀 Deployment Testing

### Heroku Backend Deployment

1. **Deploy to Heroku:**
   ```bash
   cd packages/nextjs/server
   ./heroku-deploy.sh
   ```

2. **Test Deployed Backend:**
   ```bash
   # Test WebSocket connection
   wscat -c wss://your-poker-server.herokuapp.com
   
   # Send test command
   > {"cmdId":"deploy-test","type":"LIST_TABLES"}
   < {"tableId":"","type":"TABLE_LIST","tables":[...]}
   ```

3. **Check Heroku Logs:**
   ```bash
   heroku logs --tail -a your-poker-server
   # Should show successful WebSocket connections
   ```

### Vercel Frontend Deployment

1. **Deploy to Vercel:**
   ```bash
   cd packages/nextjs
   vercel --prod
   ```

2. **Set Production Environment:**
   ```bash
   # In Vercel dashboard, set:
   NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com
   ```

3. **Test Production Integration:**
   - Visit deployed Vercel URL
   - Navigate to lobby
   - Verify WebSocket connects to Heroku backend
   - Test complete game flow in production

### Production Load Testing

**Multi-User Production Test:**
1. Share production URL with team
2. Have multiple users join same table simultaneously
3. Play complete poker hands
4. Monitor performance and stability

**Performance Monitoring:**
```bash
# Monitor Heroku app
heroku metrics -a your-poker-server

# Check connection counts
heroku logs --tail -a your-poker-server | grep "connection"
```

## 🐛 Troubleshooting Tests

### Common Test Failures

**WebSocket Connection Fails:**
```bash
# Check server is running
lsof -i :8080

# Check environment variables
echo $NEXT_PUBLIC_WS_URL

# Test direct connection
wscat -c ws://localhost:8080
```

**Tables Don't Load in Lobby:**
```bash
# Check browser console for errors
# Verify WebSocket connection in Network tab
# Check server logs for WebSocket messages
```

**Game Actions Don't Work:**
```bash
# Verify player is seated properly
# Check if it's player's turn to act
# Confirm WebSocket messages are being sent/received
```

**Docker Services Not Starting:**
```bash
# Check Docker is running
docker version

# Check compose file syntax
docker-compose config

# View service logs
docker-compose logs pokernft-server
docker-compose logs redis
```

### Debug Commands

**Backend Debugging:**
```bash
# Check Redis connection
docker exec -it pokernft_redis_1 redis-cli ping

# View game state in Redis
docker exec -it pokernft_redis_1 redis-cli keys "*"

# Monitor WebSocket connections
cd packages/nextjs/server
DEBUG=pokernft:* yarn dev
```

**Frontend Debugging:**
```bash
# Check environment variables in browser
console.log('WS URL:', process.env.NEXT_PUBLIC_WS_URL)

# Monitor WebSocket in dev tools Network tab
# Check for JavaScript errors in Console
```

## ✅ Test Success Criteria

### Development Environment
- [ ] Backend starts without errors on port 8080
- [ ] Frontend starts without errors on port 3005
- [ ] WebSocket connection established between frontend/backend
- [ ] Tables load in lobby page
- [ ] Single player can join table
- [ ] Multiple players can play complete poker hand

### Production Environment  
- [ ] Backend deploys successfully to Heroku
- [ ] Frontend deploys successfully to Vercel
- [ ] Production WebSocket connection works (wss://)
- [ ] CORS configured correctly
- [ ] Complete game flow works in production
- [ ] Performance acceptable under load

### Game Logic
- [ ] All poker actions work correctly
- [ ] Hand evaluation accurate
- [ ] Pot distribution correct
- [ ] Blind rotation working
- [ ] Timer functionality works
- [ ] Reconnection restores game state

## 📊 Performance Benchmarks

### Expected Performance
- **WebSocket Connection:** < 100ms latency
- **Action Response Time:** < 500ms
- **Page Load Time:** < 3 seconds
- **Memory Usage:** Stable over time
- **Concurrent Players:** 50+ per table

### Load Testing
```bash
# Simple load test
for i in {1..10}; do
  wscat -c ws://localhost:8080 &
done

# Monitor resource usage
docker stats
```

---

This testing guide ensures all components work together and provides confidence for production deployment.