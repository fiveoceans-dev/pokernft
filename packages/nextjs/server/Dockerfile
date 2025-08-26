# Multi-stage Dockerfile for PokerNFT WebSocket Server
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code and dependencies
COPY src/ ./src/
COPY tsconfig.json ./
COPY game-engine/ ./game-engine/
COPY utils/ ./utils/

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
COPY package*.json ./

# Install production dependencies and ts-node
RUN npm ci --omit=dev && npm cache clean --force && npm install -g ts-node

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy source files for ts-node execution
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/game-engine ./game-engine
COPY --from=builder /app/utils ./utils

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