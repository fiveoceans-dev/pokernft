# 🔗 Integration Guide

Complete guide to connecting your PokerNFT frontend (Vercel) with the WebSocket server (Heroku) and setting up the full production environment.

## 🎯 Overview

This guide covers the integration of three main components:

1. **Frontend (Vercel)** - Next.js application serving the poker game UI
2. **Backend (Heroku)** - WebSocket server handling game logic and multiplayer
3. **Blockchain (Starknet)** - Smart contracts for NFTs and poker mechanics

```
┌─────────────────┐    WebSocket     ┌──────────────────┐
│  Frontend       │ ←─────────────→  │  Backend         │
│  (Vercel)       │    wss://        │  (Heroku)        │
│                 │                  │                  │
│ - Next.js UI    │                  │ - Game Engine    │
│ - Wallet Connect│                  │ - Session Mgmt   │
│ - Game Client   │                  │ - Redis Storage  │
└─────────────────┘                  └──────────────────┘
         │                                     │
         │                                     │
         │            Blockchain               │
         └─────────────────────────────────────┘
                 │  Smart Contracts  │
                 │    (Starknet)     │
                 └───────────────────┘
```

## 🚀 Quick Integration Setup

### Prerequisites Checklist

Before integration, ensure you have:

- ✅ **Frontend deployed** to Vercel
- ✅ **Backend deployed** to Heroku with Docker
- ✅ **Domain names** for both services
- ✅ **Environment variables** configured
- ✅ **SSL certificates** active (automatic with both platforms)

### Step-by-Step Integration

1. **Deploy Backend First**
   ```bash
   cd packages/nextjs/server
   ./heroku-deploy.sh
   # Note the Heroku URL: https://your-poker-server.herokuapp.com
   ```

2. **Configure Frontend Environment**
   ```bash
   # In Vercel dashboard, set:
   NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com
   ```

3. **Deploy Frontend**
   ```bash
   cd packages/nextjs
   vercel --prod
   # Note the Vercel URL: https://your-app.vercel.app
   ```

4. **Configure Backend CORS**
   ```bash
   # In Heroku, set:
   heroku config:set ALLOWED_ORIGINS=https://your-app.vercel.app -a your-poker-server
   ```

5. **Test Integration**
   - Open frontend URL
   - Check browser console for WebSocket connection
   - Try joining a poker table

## 🔧 Environment Configuration

### Frontend Environment Variables (Vercel)

**Production Environment:**
```bash
# WebSocket Connection
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com

# Starknet Configuration
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8

# Contract Addresses (after deployment)
NEXT_PUBLIC_POKER_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...

# App Configuration
NEXT_PUBLIC_APP_NAME=PokerNFT
NEXT_PUBLIC_DEV_MODE=false
```

**Preview Environment:**
```bash
# For branch deployments, you might want to use staging server
NEXT_PUBLIC_WS_URL=wss://staging-poker-server.herokuapp.com
NEXT_PUBLIC_STARKNET_NETWORK=sepolia  # Keep testnet for previews
```

### Backend Environment Variables (Heroku)

```bash
# Essential Configuration
NODE_ENV=production
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app.netlify.app

# Session Security
SESSION_SECRET=your-super-secret-production-key

# Redis (automatically set by Heroku Redis addon)
REDIS_URL=redis://...

# Optional: Custom Game Settings
GAME_START_COUNTDOWN_SECONDS=10
ACTION_TIMEOUT_SECONDS=30
MIN_PLAYERS_TO_START=2
```

## 🌐 Domain Configuration

### Custom Domains Setup

**Frontend Custom Domain:**
1. **Purchase Domain**: `pokernft.com`
2. **Add to Vercel**:
   ```bash
   vercel domains add pokernft.com
   vercel domains add www.pokernft.com
   ```
3. **Configure DNS**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

**Backend Custom Domain (Optional):**
1. **Add to Heroku**:
   ```bash
   heroku domains:add api.pokernft.com -a your-poker-server
   ```
2. **Configure DNS**:
   ```
   Type: CNAME
   Name: api
   Value: your-poker-server.herokuapp.com
   ```

### SSL Certificates

Both Vercel and Heroku provide automatic SSL:
- **Vercel**: Automatic Let's Encrypt certificates
- **Heroku**: Automatic SSL for custom domains

**Verify SSL:**
```bash
# Test frontend
curl -I https://pokernft.com

# Test backend WebSocket
wscat -c wss://api.pokernft.com
```

## 🔄 WebSocket Integration

### Frontend WebSocket Client

**Connection Setup:**
```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react'

export function useWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    // Create WebSocket connection
    ws.current = new WebSocket(url)
    
    ws.current.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
    }
    
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setLastMessage(message)
    }
    
    ws.current.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CLOSED) {
          ws.current = new WebSocket(url)
        }
      }, 3000)
    }
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.current?.close()
    }
  }, [url])

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    }
  }

  return { connected, lastMessage, sendMessage }
}
```

**Usage in Components:**
```typescript
// components/PokerLobby.tsx
import { useWebSocket } from '../hooks/useWebSocket'

export function PokerLobby() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  const { connected, lastMessage, sendMessage } = useWebSocket(wsUrl)

  const listTables = () => {
    sendMessage({
      cmdId: Date.now().toString(),
      type: 'LIST_TABLES'
    })
  }

  const joinTable = (tableId: string, seat: number, buyIn: number) => {
    sendMessage({
      cmdId: Date.now().toString(),
      type: 'SIT',
      tableId,
      seat,
      buyIn
    })
  }

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <button onClick={listTables}>Refresh Tables</button>
      {/* Table list and join controls */}
    </div>
  )
}
```

### Error Handling & Reconnection

**Advanced WebSocket Hook:**
```typescript
// hooks/useWebSocketWithReconnect.ts
export function useWebSocketWithReconnect(url: string) {
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 5
  const reconnectInterval = 3000

  const reconnect = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1)
        // Reinitialize connection
      }, reconnectInterval * Math.pow(2, reconnectAttempts)) // Exponential backoff
    }
  }

  // Reset attempts on successful connection
  useEffect(() => {
    if (connected) {
      setReconnectAttempts(0)
    }
  }, [connected])

  return { connected, lastMessage, sendMessage, reconnectAttempts }
}
```

## 🔐 CORS Configuration

### Backend CORS Setup

**Basic CORS (Already implemented in server):**
```typescript
// In packages/nextjs/server/src/index.ts
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3005'
]

// WebSocket CORS handling
wss.on('connection', (ws, request) => {
  const origin = request.headers.origin
  
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.log(`Rejected connection from origin: ${origin}`)
    ws.close(1008, 'Origin not allowed')
    return
  }
  
  // Continue with connection handling...
})
```

**Production CORS Configuration:**
```bash
# Set in Heroku environment
heroku config:set ALLOWED_ORIGINS="https://pokernft.com,https://www.pokernft.com,https://pokernft.vercel.app" -a your-poker-server
```

### Frontend CORS Considerations

**WebSocket Connection:**
```typescript
// Ensure proper protocol
const getWebSocketUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL
  
  // Use wss:// for HTTPS pages, ws:// for HTTP
  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:'
    if (isSecure && baseUrl?.startsWith('ws://')) {
      return baseUrl.replace('ws://', 'wss://')
    }
  }
  
  return baseUrl
}
```

## 🧪 Testing Integration

### Manual Testing

**1. Connection Test:**
```bash
# Test WebSocket connection
wscat -c wss://your-poker-server.herokuapp.com

# Send test command
> {"cmdId":"test1","type":"LIST_TABLES"}

# Should receive response
< {"tableId":"","type":"TABLE_LIST","tables":[...]}
```

**2. Frontend-Backend Integration:**
1. Open browser dev tools (F12)
2. Navigate to your Vercel-deployed app
3. Check Network tab for WebSocket connection
4. Check Console for connection logs
5. Test joining a table and game actions

**3. Multi-User Testing:**
```bash
# Open multiple browser windows/incognito tabs
# Each should get a unique session
# Test multiplayer functionality:
# - Multiple users joining same table
# - Game start countdown
# - Poker actions (fold, call, raise)
# - Hand completion and payouts
```

### Automated Testing

**Frontend E2E Tests:**
```typescript
// tests/integration.test.ts
import { test, expect } from '@playwright/test'

test('WebSocket connection and game flow', async ({ page }) => {
  // Navigate to app
  await page.goto('https://pokernft.com')
  
  // Check WebSocket connection
  await page.waitForSelector('.connection-status:has-text("Connected")')
  
  // List tables
  await page.click('button:has-text("Refresh Tables")')
  
  // Join table
  await page.click('.table-card:first-child .join-button')
  
  // Verify user joined
  await expect(page.locator('.player-seat.occupied')).toBeVisible()
})
```

**Backend API Tests:**
```typescript
// tests/websocket.test.ts
import WebSocket from 'ws'

test('WebSocket server responds to commands', async () => {
  const ws = new WebSocket('wss://your-poker-server.herokuapp.com')
  
  await new Promise(resolve => ws.on('open', resolve))
  
  // Send list tables command
  ws.send(JSON.stringify({
    cmdId: 'test1',
    type: 'LIST_TABLES'
  }))
  
  // Wait for response
  const response = await new Promise(resolve => {
    ws.on('message', (data) => {
      resolve(JSON.parse(data.toString()))
    })
  })
  
  expect(response.type).toBe('TABLE_LIST')
  expect(Array.isArray(response.tables)).toBe(true)
})
```

## 📊 Monitoring Integration

### Health Checks

**Backend Health Endpoint:**
```typescript
// Add to server/src/index.ts
import { createServer } from 'http'

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
      uptime: process.uptime()
    }))
    return
  }
  
  res.writeHead(404)
  res.end()
})

// Start HTTP server alongside WebSocket
server.listen(PORT, () => {
  console.log(`Health check available at http://localhost:${PORT}/health`)
})
```

**Frontend Health Monitoring:**
```typescript
// hooks/useHealthCheck.ts
export function useHealthCheck() {
  const [status, setStatus] = useState('checking')
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_WS_URL?.replace('wss://', 'https://').replace('ws://', 'http://')}/health`)
        const data = await response.json()
        setStatus(data.status)
      } catch (error) {
        setStatus('unhealthy')
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return status
}
```

### Error Tracking

**Frontend Error Tracking:**
```typescript
// utils/errorTracking.ts
export function trackError(error: Error, context: string) {
  console.error(`[${context}] Error:`, error)
  
  // Send to error tracking service
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry.captureException(error, { tags: { context } })
  }
  
  // Or send to custom endpoint
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }).catch(() => {}) // Fail silently for error tracking
}
```

**Usage in Components:**
```typescript
// In useWebSocket hook
ws.current.onerror = (error) => {
  console.error('WebSocket error:', error)
  trackError(new Error('WebSocket connection failed'), 'websocket')
}
```

## 🚀 Production Deployment Checklist

### Pre-deployment

- [ ] **Environment Variables Set**
  - [ ] Frontend: `NEXT_PUBLIC_WS_URL` points to production server
  - [ ] Backend: `ALLOWED_ORIGINS` includes production frontend domain
  - [ ] Both: All required environment variables configured

- [ ] **SSL Certificates Active**
  - [ ] Frontend HTTPS working
  - [ ] Backend WSS (WebSocket Secure) working

- [ ] **DNS Configuration**
  - [ ] Custom domains pointing to correct services
  - [ ] TTL values appropriate for production

### Post-deployment Testing

- [ ] **Connection Testing**
  - [ ] WebSocket connection establishes successfully
  - [ ] Multiple users can connect simultaneously
  - [ ] Reconnection works after network interruption

- [ ] **Game Flow Testing**
  - [ ] Table listing works
  - [ ] User can join tables
  - [ ] Game countdown starts with 2+ players
  - [ ] Poker actions work (fold, call, raise)
  - [ ] Hand completion and payouts work

- [ ] **Performance Testing**
  - [ ] Page load times < 3 seconds
  - [ ] WebSocket latency < 100ms
  - [ ] Memory usage stable over time

- [ ] **Mobile Testing**
  - [ ] Game works on mobile devices
  - [ ] WebSocket connection stable on mobile
  - [ ] Touch interactions work properly

### Monitoring Setup

- [ ] **Health Checks**
  - [ ] Backend health endpoint responding
  - [ ] Frontend error boundaries in place
  - [ ] Uptime monitoring configured

- [ ] **Analytics**
  - [ ] User analytics tracking (if desired)
  - [ ] Game event tracking
  - [ ] Performance monitoring

- [ ] **Alerting**
  - [ ] Server downtime alerts
  - [ ] High error rate alerts
  - [ ] Performance degradation alerts

## 🆘 Troubleshooting Integration

### Common Issues

**WebSocket Connection Fails:**
```
❌ Issue: "WebSocket connection failed"
🔍 Check:
  - NEXT_PUBLIC_WS_URL uses correct protocol (wss:// for HTTPS)
  - Backend server is running and accessible
  - CORS settings allow frontend domain
  - Network/firewall not blocking WebSocket connections

✅ Solutions:
  - Verify environment variables in both services
  - Check server logs: `heroku logs --tail -a your-server`
  - Test direct connection: `wscat -c wss://your-server.com`
```

**CORS Errors:**
```
❌ Issue: "Access to WebSocket at '...' from origin '...' has been blocked by CORS policy"
🔍 Check:
  - ALLOWED_ORIGINS includes your frontend domain
  - No trailing slashes in CORS configuration
  - Both www and non-www versions included if needed

✅ Solutions:
  - Update server CORS configuration
  - Restart server after environment changes
  - Verify origin header matches exactly
```

**Environment Variables Not Working:**
```
❌ Issue: Environment variables undefined in frontend
🔍 Check:
  - Variable names start with NEXT_PUBLIC_ for client-side access
  - Variables set for correct environment (production/preview/development)
  - No typos in variable names
  - Browser cache cleared after changes

✅ Solutions:
  - Redeploy frontend after setting variables
  - Check Vercel deployment logs for variable values
  - Use server-side rendering for sensitive variables
```

### Debug Tools

**Backend Debugging:**
```bash
# View real-time server logs
heroku logs --tail -a your-poker-server

# Check environment variables
heroku config -a your-poker-server

# Test WebSocket directly
wscat -c wss://your-poker-server.herokuapp.com
```

**Frontend Debugging:**
```javascript
// Add to browser console
console.log('Frontend Config:', {
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
  origin: window.location.origin,
  userAgent: navigator.userAgent
})

// Monitor WebSocket in Network tab
// Check Console for connection errors
```

### Performance Issues

**High Latency:**
- Check server location vs user location
- Consider using Heroku regions closer to users
- Implement connection pooling
- Monitor server resource usage

**Connection Drops:**
- Implement heartbeat/ping mechanism
- Add exponential backoff for reconnections
- Check for memory leaks on server
- Monitor network stability

---

🎉 **Integration Complete!** Your frontend and backend are now connected and communicating seamlessly.