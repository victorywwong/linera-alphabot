#!/usr/bin/env bash

set -eu

echo "🚀 Starting AlphaBot buildathon demo..."
echo ""

# Source nvm to make Node.js available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Initialize Linera network
echo "📡 Starting Linera network..."
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

echo "✅ Linera network started successfully!"
echo ""

# Build and publish backend (Linera contracts)
echo "🔨 Building Linera contracts..."
cd /build/contracts/bot-state

# Build WASM binaries
cargo build --release --target wasm32-unknown-unknown

# Publish and create the application
echo "📦 Publishing bot-state application..."
linera project publish-and-create bot-state

# Get the application ID and export it
APP_ID=$(linera wallet show | grep -A 1 "Applications" | tail -n 1 | awk '{print $1}')
export LINERA_APP_ID="$APP_ID"

echo "✅ Bot-state contract deployed!"
echo "   Application ID: $APP_ID"
echo ""

# Install and run bot-service
cd /build/bot-service
echo "📦 Installing bot-service dependencies..."
pnpm install

echo "🔨 Building bot-service..."
pnpm build

echo "🤖 Starting bot-service..."
pnpm start &
BOT_SERVICE_PID=$!

echo "✅ Bot-service started (PID: $BOT_SERVICE_PID)"
echo ""

# Install and run frontend on port 5173
cd /build/frontend
echo "📦 Installing frontend dependencies..."
pnpm install

echo "🎨 Building frontend..."
pnpm build

echo "🌐 Starting frontend on port 5173..."
PORT=5173 pnpm start

# Keep the script running
wait
