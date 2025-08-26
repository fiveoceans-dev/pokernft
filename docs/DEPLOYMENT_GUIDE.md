# 🚀 PokerNFT Deployment Guide

Complete deployment guide for the PokerNFT application covering frontend (Vercel) and backend (Heroku) deployment.

## 📋 Overview

PokerNFT is a full-stack decentralized poker application built with:

- **Frontend**: Next.js 14 application deployed to **Vercel**
- **Backend**: WebSocket server with game engine deployed to **Heroku**
- **Blockchain**: Starknet smart contracts
- **Database**: Redis for session and game state persistence

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Vercel        │    │   Heroku        │    │   Starknet      │
│   (Frontend)    ├────┤   (Backend)     ├────┤   (Blockchain)  │
│                 │    │                 │    │                 │
│ • Next.js App   │    │ • WebSocket     │    │ • Smart         │
│ • Static Assets │    │ • Game Engine   │    │   Contracts     │
│ • CDN           │    │ • Redis State   │    │ • NFTs          │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start Deployment

### Prerequisites

1. **Accounts**:
   - [Vercel Account](https://vercel.com/signup)
   - [Heroku Account](https://signup.heroku.com/)
   - GitHub/GitLab repository

2. **Tools**:
   ```bash
   # Install required CLI tools
   npm install -g vercel
   npm install -g heroku
   
   # Verify installations
   vercel --version
   heroku --version
   ```

### 1. Deploy Backend to Heroku (Required First)

The WebSocket server must be deployed first as the frontend depends on it.

```bash
# Navigate to server directory
cd packages/nextjs/server

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-poker-server

# Set stack to container
heroku stack:set container -a your-poker-server

# Add Redis addon (recommended)
heroku addons:create heroku-redis:mini -a your-poker-server

# Set environment variables
heroku config:set NODE_ENV=production -a your-poker-server
heroku config:set ALLOWED_ORIGINS=https://your-frontend.vercel.app -a your-poker-server

# Deploy using the deployment script
chmod +x heroku-deploy.sh
./heroku-deploy.sh
```

**Note your Heroku app URL**: `https://your-poker-server.herokuapp.com`

### 2. Deploy Frontend to Vercel

```bash
# Navigate to Next.js directory
cd packages/nextjs

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_WS_URL
# Enter: wss://your-poker-server.herokuapp.com

vercel env add NEXT_PUBLIC_PROVIDER_URL
# Enter: https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8

# Deploy to production
vercel --prod
```

## 🔧 Detailed Deployment Instructions

### Backend Deployment (Heroku)

For complete backend deployment instructions, see: [**HEROKU_DEPLOYMENT.md**](./HEROKU_DEPLOYMENT.md)

**Key Points**:
- Uses Docker containers for consistent deployment
- Includes game engine and WebSocket handling
- Supports Redis for state persistence
- Health checks and monitoring included

**Environment Variables**:
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app
REDIS_URL=redis://... # (auto-set with addon)
SESSION_SECRET=your-secret-key
```

### Frontend Deployment (Vercel)

For complete frontend deployment instructions, see: [**VERCEL_DEPLOYMENT.md**](./VERCEL_DEPLOYMENT.md)

**Key Points**:
- Automatic deployments from GitHub
- Edge runtime for global performance
- Environment variables for different stages
- Built-in CDN and HTTPS

**Environment Variables**:
```bash
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
NEXT_PUBLIC_SEPOLIA_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
```

## 🏗️ Project Structure

```
pokernft/
├── packages/
│   ├── nextjs/                 # Frontend (Deploy to Vercel)
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # React components
│   │   ├── game-engine/       # Shared game engine
│   │   ├── hooks/            # Custom React hooks
│   │   ├── server/           # Backend (Deploy to Heroku)
│   │   │   ├── src/          # Server source code
│   │   │   ├── Dockerfile    # Docker configuration
│   │   │   ├── heroku.yml    # Heroku deployment config
│   │   │   └── package.json  # Server dependencies
│   │   ├── vercel.json       # Vercel configuration
│   │   └── package.json      # Frontend dependencies
│   └── snfoundry/            # Smart contracts
├── docs/                     # Documentation
│   ├── DEPLOYMENT_GUIDE.md   # This file
│   ├── HEROKU_DEPLOYMENT.md  # Heroku deployment details
│   └── VERCEL_DEPLOYMENT.md  # Vercel deployment details
└── package.json              # Root workspace configuration
```

## 🌍 Environment Management

### Development
```bash
# Frontend (local)
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8

# Backend (local)
NODE_ENV=development
PORT=8080
```

### Staging/Preview
```bash
# Frontend (Vercel preview deployments)
NEXT_PUBLIC_WS_URL=wss://staging-poker-server.herokuapp.com
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8

# Backend (Heroku staging app)
NODE_ENV=production
ALLOWED_ORIGINS=https://pokernft-git-staging.vercel.app
```

### Production
```bash
# Frontend (Vercel production)
NEXT_PUBLIC_WS_URL=wss://your-poker-server.herokuapp.com
NEXT_PUBLIC_PROVIDER_URL=https://starknet-sepolia.blastapi.io/your-key/rpc/v0_8

# Backend (Heroku production app)
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com,https://pokernft.vercel.app
```

## 🔄 Continuous Deployment

### Automatic Deployments

**Frontend (Vercel)**:
- Automatic deployment on push to `main` branch
- Preview deployments for all branches
- Integration with GitHub/GitLab

**Backend (Heroku)**:
- Manual deployment via git subtree push
- Can be automated with GitHub Actions

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PokerNFT
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-poker-server"
          heroku_email: "your-email@example.com"
          usedocker: true
          appdir: "packages/nextjs/server"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          working-directory: packages/nextjs
```

## 📊 Monitoring & Health Checks

### Backend Health Check
```bash
# HTTP health endpoint
curl https://your-poker-server.herokuapp.com/health

# WebSocket connection test
wscat -c wss://your-poker-server.herokuapp.com
> {"cmdId":"health","type":"LIST_TABLES"}
```

### Frontend Health Check
```bash
# Check if frontend is accessible
curl https://your-frontend.vercel.app

# Check API routes
curl https://your-frontend.vercel.app/api/price
```

### Monitoring Tools

**Heroku**:
- Built-in metrics and logging
- Add-ons: Papertrail (logging), New Relic (APM)

**Vercel**:
- Analytics dashboard
- Web Vitals monitoring
- Function logs and metrics

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   ```bash
   # Check CORS settings
   heroku config:get ALLOWED_ORIGINS -a your-poker-server
   
   # Verify WebSocket URL uses wss:// in production
   vercel env ls
   ```

2. **Build Failures**
   ```bash
   # Check build logs
   heroku logs --tail -a your-poker-server
   vercel logs
   
   # Common causes: Missing env vars, TypeScript errors
   ```

3. **Environment Variable Issues**
   ```bash
   # List all environment variables
   heroku config -a your-poker-server
   vercel env ls
   
   # Add missing variables
   heroku config:set VAR=value -a your-poker-server
   vercel env add VAR_NAME
   ```

### Getting Help

1. **Check Documentation**:
   - [HEROKU_DEPLOYMENT.md](./HEROKU_DEPLOYMENT.md) - Detailed Heroku instructions
   - [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Detailed Vercel instructions

2. **Platform Status**:
   - [Heroku Status](https://status.heroku.com/)
   - [Vercel Status](https://www.vercel-status.com/)

3. **Debug Commands**:
   ```bash
   # Heroku debugging
   heroku logs --tail -a your-app
   heroku run bash -a your-app
   
   # Vercel debugging
   vercel logs
   vercel dev # Local development with production environment
   ```

## 💰 Cost Optimization

### Free Tier Options
- **Heroku**: Free tier available (with sleep mode)
- **Vercel**: Generous free tier for personal projects
- **Redis**: Heroku Redis mini plan (free tier)

### Production Recommendations
- **Heroku**: Standard-1X dyno ($25/month) + Redis Premium
- **Vercel**: Pro plan for team collaboration and advanced features
- **Monitoring**: Basic monitoring included, premium options available

## 🎉 Deployment Checklist

### Before Deployment
- [ ] Contracts deployed to Starknet
- [ ] Environment variables configured
- [ ] DNS settings (if using custom domain)
- [ ] Monitoring and alerts set up

### After Deployment
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Frontend-backend communication verified
- [ ] Game functionality tested
- [ ] Performance monitoring active

---

**🎯 Deployment Complete!** Your PokerNFT application is now live:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-poker-server.herokuapp.com`

For specific platform details, refer to the individual deployment guides.