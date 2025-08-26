#!/bin/bash

# PokerNFT WebSocket Server - Heroku Deployment Script

set -e  # Exit on any error

echo "🚀 Deploying PokerNFT WebSocket Server to Heroku..."

# Check if we're in the server directory
if [ ! -f "Procfile" ]; then
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

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Check if Heroku app exists
read -p "Enter your Heroku app name: " APP_NAME
if ! heroku apps:info "$APP_NAME" &> /dev/null; then
    echo "❌ Error: Heroku app '$APP_NAME' does not exist"
    echo "   Create it first: heroku create $APP_NAME"
    exit 1
fi

# Deploy using git subtree
echo "📦 Deploying to Heroku..."
cd ../../../  # Go to repo root

# Add heroku remote if it doesn't exist
if ! git remote | grep -q heroku; then
    heroku git:remote -a "$APP_NAME"
fi

# Deploy server directory to Heroku
git subtree push --prefix=packages/nextjs/server heroku main

echo "✅ Deployment complete!"
echo "🌐 Your WebSocket server is available at: https://$APP_NAME.herokuapp.com"
echo "🔗 WebSocket URL: wss://$APP_NAME.herokuapp.com"