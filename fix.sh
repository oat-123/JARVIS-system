#!/bin/bash

# J.A.R.V.I.S Fix Script
echo "🔧 Running J.A.R.V.I.S Fix Script..."

# Clear cache
echo "🧹 Clearing cache..."
rm -rf .next
rm -rf node_modules

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

# Set Node options for OpenSSL
echo "🔧 Setting Node options..."
export NODE_OPTIONS="--openssl-legacy-provider"

# Build project
echo "🏗️  Building project..."
npm run build

echo "✅ Fix script completed!"
