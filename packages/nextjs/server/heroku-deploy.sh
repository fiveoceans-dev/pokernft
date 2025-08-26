#!/bin/bash

# PokerNFT WebSocket Server - Docker Deployment Script for Heroku

set -e  # Exit on any error

echo "🚀 Deploying PokerNFT WebSocket Server to Heroku using Docker..."

# Check if we're in the server directory
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Run this script from the server directory"
    echo "   cd packages/nextjs/server && ./heroku-deploy.sh"
    exit 1
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI is not installed"
    echo "   Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Heroku"
    echo "   Run: heroku login"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "   Install it from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Get or create Heroku app
read -p "Enter your Heroku app name: " APP_NAME

# Check if app exists, create if not
if ! heroku apps:info "$APP_NAME" &> /dev/null; then
    echo "📱 Creating Heroku app: $APP_NAME"
    heroku create "$APP_NAME"
    echo "✅ App created successfully"
else
    echo "📱 Using existing Heroku app: $APP_NAME"
fi

# Set the app to use container stack
echo "🐳 Setting Heroku stack to container..."
heroku stack:set container -a "$APP_NAME"

# Set essential environment variables
echo "🔧 Setting environment variables..."
heroku config:set NODE_ENV=production -a "$APP_NAME" --app "$APP_NAME"

# Ask if user wants to add Redis
read -p "Do you want to add Redis addon? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Adding Redis addon..."
    if ! heroku addons:info heroku-redis -a "$APP_NAME" &> /dev/null; then
        heroku addons:create heroku-redis:mini -a "$APP_NAME"
        echo "✅ Redis addon added"
    else
        echo "ℹ️  Redis addon already exists"
    fi
fi

# Ask for frontend URL for CORS
read -p "Enter your frontend URL (e.g., https://yourapp.vercel.app): " FRONTEND_URL
if [ ! -z "$FRONTEND_URL" ]; then
    heroku config:set ALLOWED_ORIGINS="$FRONTEND_URL" -a "$APP_NAME"
    echo "✅ CORS configured for: $FRONTEND_URL"
fi

# Deploy using git subtree (Heroku will use heroku.yml to build with Docker)
echo "📦 Deploying to Heroku..."
cd ../../../  # Go to repo root

# Add heroku remote if it doesn't exist
if ! git remote | grep -q heroku; then
    heroku git:remote -a "$APP_NAME"
fi

# Commit current changes if there are any
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️  There are uncommitted changes. Committing them now..."
    git add packages/nextjs/server/
    git commit -m "Deploy: Update server configuration for Docker deployment" || true
fi

# Deploy server directory to Heroku using subtree
echo "🚀 Pushing to Heroku..."
git subtree push --prefix=packages/nextjs/server heroku main

# Wait a moment for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Check deployment status
echo "🔍 Checking deployment status..."
heroku ps -a "$APP_NAME"

# Show logs
echo "📝 Recent logs:"
heroku logs --tail --num 50 -a "$APP_NAME" &
LOGS_PID=$!

# Wait for a few seconds then kill log tail
sleep 10
kill $LOGS_PID 2>/dev/null || true

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your WebSocket server is available at: https://$APP_NAME.herokuapp.com"
echo "🔗 WebSocket URL for frontend: wss://$APP_NAME.herokuapp.com"
echo ""
echo "📋 Next steps:"
echo "  1. Test your WebSocket connection"
echo "  2. Update your frontend's NEXT_PUBLIC_WS_URL environment variable"
echo "  3. Deploy your frontend to Vercel"
echo ""
echo "🔧 Useful commands:"
echo "  heroku logs --tail -a $APP_NAME        # View live logs"
echo "  heroku ps -a $APP_NAME                 # Check dyno status"
echo "  heroku config -a $APP_NAME             # View environment variables"