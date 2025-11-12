#!/bin/bash

# Build script for Render.com deployment
echo "🔨 Building TON NFT Mini-App for production..."

# Navigate to app directory
cd app

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the app
echo "🚀 Building app..."
npm run build

echo "✅ Build complete! Output in app/dist/"
