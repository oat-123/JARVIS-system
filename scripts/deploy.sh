#!/bin/bash

# J.A.R.V.I.S Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="jarvis-auth-system"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo "📋 Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: No .env file found"
fi

# Check required environment variables
REQUIRED_VARS=(
    "GOOGLE_PROJECT_ID"
    "GOOGLE_PRIVATE_KEY_ID"
    "GOOGLE_PRIVATE_KEY"
    "GOOGLE_CLIENT_EMAIL"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_SPREADSHEET_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Build application
echo "🔨 Building application..."
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing process if running
if pm2 list | grep -q "$APP_NAME"; then
    echo "🛑 Stopping existing process..."
    pm2 stop "$APP_NAME" || true
    pm2 delete "$APP_NAME" || true
fi

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "$APP_NAME" -- start

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 startup script..."
pm2 startup

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 status

echo "📝 Useful commands:"
echo "  - View logs: pm2 logs $APP_NAME"
echo "  - Restart app: pm2 restart $APP_NAME"
echo "  - Stop app: pm2 stop $APP_NAME"
echo "  - Monitor: pm2 monit" 