# 🚀 Heroku Deployment Guide

Complete guide to deploying the PokerNFT WebSocket server to Heroku using Docker containers.

## 📋 Prerequisites

Before deploying to Heroku, ensure you have:

- **Heroku Account**: [Sign up for free](https://signup.heroku.com/)
- **Heroku CLI**: [Install the CLI](https://devcenter.heroku.com/articles/heroku-cli)
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Git**: Version control system

### Quick Prerequisites Check

```bash
# Check if tools are installed
heroku --version
docker --version
git --version

# Login to Heroku
heroku login
```

## 🎯 Deployment Overview

The PokerNFT server uses **Docker containers** instead of traditional buildpacks for deployment. This provides:

- ✅ **Consistent Environment** - Same runtime locally and in production
- ✅ **Optimized Images** - Multi-stage builds for smaller containers
- ✅ **Better Dependency Management** - Explicit dependency control
- ✅ **Easier Scaling** - Container-based scaling

## 🚀 Quick Deploy (Automated)

The easiest way to deploy:

```bash
# From the repository root
cd packages/nextjs/server

# Make deployment script executable (if needed)
chmod +x heroku-deploy.sh

# Run deployment script
./heroku-deploy.sh
```

The script will:
1. ✅ Check prerequisites (Heroku CLI, Docker, Git)
2. ✅ Create or use existing Heroku app
3. ✅ Configure container stack
4. ✅ Set up environment variables
5. ✅ Optionally add Redis addon
6. ✅ Deploy using Docker build
7. ✅ Show deployment status and logs

## 📋 Manual Deployment (Step by Step)

If you prefer manual control or the script fails:

### 1. Create Heroku Application

```bash
# Create new app (replace 'your-poker-server' with your preferred name)
heroku create your-poker-server

# Or use existing app
heroku apps:info your-poker-server
```

### 2. Configure for Container Deployment

```bash
# Set stack to container
heroku stack:set container -a your-poker-server

# Add Git remote (if not already added)
heroku git:remote -a your-poker-server
```

### 3. Set Environment Variables

**Required Variables:**
```bash
heroku config:set NODE_ENV=production -a your-poker-server
```

**Optional but Recommended:**
```bash
# CORS configuration for frontend
heroku config:set ALLOWED_ORIGINS=https://your-frontend.vercel.app -a your-poker-server

# Custom session secret
heroku config:set SESSION_SECRET=your-super-secret-key -a your-poker-server
```

### 4. Add Redis (Optional but Recommended)

```bash
# Add Redis addon for state persistence
heroku addons:create heroku-redis:mini -a your-poker-server

# Check addon status
heroku addons:info heroku-redis -a your-poker-server

# REDIS_URL environment variable is automatically set
```

### 5. Deploy the Application

```bash
# From repository root (ensure you're in the pokernft directory)
cd /Users/platon1/DEV/GITHUB/pokernft

# Commit any changes to the server
git add packages/nextjs/server/
git commit -m "Configure server for Heroku Docker deployment"

# Push server subdirectory to Heroku using git subtree
git subtree push --prefix=packages/nextjs/server heroku main

# Alternative: Force push if needed
# git push heroku `git subtree split --prefix=packages/nextjs/server main`:main --force
```

### 6. Verify Deployment

```bash
# Check dyno status
heroku ps -a your-poker-server

# View application logs
heroku logs --tail -a your-poker-server

# Open application in browser
heroku open -a your-poker-server
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | ✅ Yes |
| `PORT` | Server port | Auto-set by Heroku | ✅ Auto |
| `REDIS_URL` | Redis connection | Auto-set if addon added | ❌ Optional |
| `ALLOWED_ORIGINS` | CORS origins | None | ⚠️ Recommended |
| `SESSION_SECRET` | Session encryption | Random | ⚠️ Recommended |

**View all variables:**
```bash
heroku config -a your-poker-server
```

**Set variables:**
```bash
# Single variable
heroku config:set VARIABLE_NAME=value -a your-poker-server

# Multiple variables
heroku config:set VAR1=value1 VAR2=value2 -a your-poker-server

# Remove variable
heroku config:unset VARIABLE_NAME -a your-poker-server
```

### Heroku Addons

**Redis (Recommended):**
```bash
# Mini (Free tier - development/testing)
heroku addons:create heroku-redis:mini -a your-poker-server

# Premium (Production)
heroku addons:create heroku-redis:premium-0 -a your-poker-server

# View Redis info
heroku redis:info -a your-poker-server
```

**Other Useful Addons:**
```bash
# Papertrail (Logging)
heroku addons:create papertrail:choklad -a your-poker-server

# New Relic (Monitoring)
heroku addons:create newrelic:wayne -a your-poker-server
```

## 🔍 Monitoring & Debugging

### Application Logs

**View Real-time Logs:**
```bash
# All logs
heroku logs --tail -a your-poker-server

# Filter by source
heroku logs --source app --tail -a your-poker-server

# Last 500 lines
heroku logs --num 500 -a your-poker-server
```

**Log Categories:**
- `app[web.1]` - Application logs
- `heroku[web.1]` - Platform logs
- `heroku[router]` - HTTP router logs

### Dyno Management

**Check Dyno Status:**
```bash
heroku ps -a your-poker-server
```

**Restart Application:**
```bash
# Restart all dynos
heroku restart -a your-poker-server

# Restart specific dyno type
heroku restart web -a your-poker-server
```

**Scale Dynos:**
```bash
# Scale to 2 web dynos
heroku ps:scale web=2 -a your-poker-server

# Scale to 0 (stop app)
heroku ps:scale web=0 -a your-poker-server
```

### Health Checking

**Manual Health Check:**
```bash
# Test WebSocket connection
wscat -c wss://your-poker-server.herokuapp.com

# Send test command
> {"cmdId":"health","type":"LIST_TABLES"}
```

**HTTP Health Check:**
```bash
curl https://your-poker-server.herokuapp.com/health
```

## 🐳 Docker Configuration

The deployment uses these Docker files:

### Current Dockerfile

The project uses a multi-stage Dockerfile that handles the game engine dependencies:

```dockerfile
# Multi-stage Dockerfile for PokerNFT WebSocket Server
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code and dependencies
COPY server/src/ ./src/
COPY server/tsconfig.json ./
COPY game-engine/ ../game-engine/
COPY utils/address.js ../utils/address.js
COPY utils/address.d.ts ../utils/address.d.ts

# Install ts-node for direct TypeScript execution
RUN npm install -g ts-node
# Create dist structure manually
RUN mkdir -p dist/src

# Stage 2: Production stage
FROM node:18-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install production dependencies and ts-node
RUN npm ci --omit=dev && npm cache clean --force && npm install -g ts-node

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy source files for ts-node execution
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /game-engine ../game-engine
COPY --from=builder /utils ../utils

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S pokernft -u 1001

# Change ownership of the app directory
RUN chown -R pokernft:nodejs /app
USER pokernft

# Expose the port (Heroku will set PORT environment variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + (process.env.PORT || 8080) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application with ts-node
CMD ["npx", "ts-node", "src/index.ts"]
```

### Current heroku.yml
```yaml
# Heroku container deployment configuration
# This tells Heroku to build and deploy the app using Docker instead of buildpacks

build:
  docker:
    web: Dockerfile
    
run:
  web: node dist/src/index.js

# Optional: Release phase for database migrations or other setup tasks
# release:
#   command:
#     - echo "Release phase - add any pre-deployment tasks here"
```

## 💰 Pricing & Scaling

### Dyno Types

| Type | RAM | CPU | Price/month | Use Case |
|------|-----|-----|-------------|-----------|
| Free | 512MB | 1x | $0 | Development (sleeps after 30min) |
| Hobby | 512MB | 1x | $7 | Always-on development |
| Standard-1X | 512MB | 1x | $25 | Light production |
| Standard-2X | 1GB | 2x | $50 | Medium production |

**Recommendations:**
- **Development**: Hobby ($7/month) for always-on testing
- **Production**: Standard-1X+ with Redis Premium

### Scaling Strategies

**Horizontal Scaling:**
```bash
# Add more web dynos
heroku ps:scale web=3 -a your-poker-server
```

**Vertical Scaling:**
```bash
# Upgrade dyno type
heroku ps:resize web=standard-2x -a your-poker-server
```

## 🔄 Continuous Deployment

### GitHub Actions Integration

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Heroku
on:
  push:
    branches: [main]
    paths: ['packages/nextjs/server/**']

jobs:
  deploy:
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
```

### Heroku Pipelines

```bash
# Create pipeline
heroku pipelines:create poker-server-pipeline

# Add apps to pipeline
heroku pipelines:add poker-server-staging --stage staging
heroku pipelines:add poker-server-prod --stage production

# Promote from staging to production
heroku pipelines:promote --app poker-server-staging
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**

```bash
# Issue: Docker build fails
# Check: Build logs for specific errors
heroku logs --tail -a your-poker-server

# Solution: Ensure Dockerfile is valid
docker build -t test-build packages/nextjs/server/
```

**Application Crashes:**

```bash
# Issue: App crashes on startup
# Check: Application logs
heroku logs --tail -a your-poker-server

# Common causes:
# - Missing environment variables
# - Port not set to process.env.PORT
# - Dependencies missing in production
```

**WebSocket Connection Issues:**

```bash
# Issue: WebSocket connections fail
# Check: Browser console and server logs

# Common causes:
# - CORS configuration missing
# - Frontend using ws:// instead of wss://
# - App sleeping (free tier)
```

**Deployment Stuck:**

```bash
# Issue: Git push hangs or fails
# Solution: Force push subtree
git subtree push --prefix=packages/nextjs/server heroku main --force
```

### Debug Commands

```bash
# Connect to dyno for debugging
heroku run bash -a your-poker-server

# Check environment variables
heroku run printenv -a your-poker-server

# Test Redis connection
heroku redis:cli -a your-poker-server
```

### Performance Issues

**Memory Usage:**
```bash
# Check memory usage
heroku logs --tail -a your-poker-server | grep "Memory"

# Upgrade dyno type if needed
heroku ps:resize web=standard-2x -a your-poker-server
```

**Connection Limits:**
- Free/Hobby: 20 concurrent connections
- Standard+: More connections based on plan

## 📈 Production Best Practices

### Security

1. **Set Strong Session Secret:**
   ```bash
   heroku config:set SESSION_SECRET=$(openssl rand -hex 32) -a your-poker-server
   ```

2. **Configure CORS Properly:**
   ```bash
   heroku config:set ALLOWED_ORIGINS=https://your-app.vercel.app -a your-poker-server
   ```

3. **Use Redis for Sessions:**
   ```bash
   heroku addons:create heroku-redis:premium-0 -a your-poker-server
   ```

### Monitoring

1. **Set up Alerts:**
   ```bash
   heroku addons:create papertrail:choklad -a your-poker-server
   ```

2. **Health Checks:**
   - Monitor `/health` endpoint
   - Set up uptime monitoring (Pingdom, StatusCake)

3. **Performance Monitoring:**
   ```bash
   heroku addons:create newrelic:wayne -a your-poker-server
   ```

### Backup & Recovery

1. **Database Backups:**
   ```bash
   # Redis backups (automatic with premium)
   heroku redis:info -a your-poker-server
   ```

2. **Code Backup:**
   - Keep Git repository synchronized
   - Tag releases for rollback capability

### Zero-Downtime Deployment

```bash
# Use preboot for zero downtime
heroku features:enable preboot -a your-poker-server

# Check deployment status
heroku releases -a your-poker-server
```

## 🆘 Support

### Getting Help

1. **Check Heroku Status:**
   - https://status.heroku.com/

2. **Review Documentation:**
   - [Heroku Container Registry](https://devcenter.heroku.com/articles/container-registry-and-runtime)
   - [Docker Deploys](https://devcenter.heroku.com/articles/build-docker-images-heroku-yml)

3. **Common Solutions:**
   - Restart application: `heroku restart -a your-app`
   - Check logs: `heroku logs --tail -a your-app`
   - Verify config: `heroku config -a your-app`

4. **Contact Support:**
   - [Heroku Support](https://help.heroku.com/) (paid plans)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/heroku)

---

🎉 **Deployment Complete!** Your WebSocket server is now running on Heroku with Docker containers.