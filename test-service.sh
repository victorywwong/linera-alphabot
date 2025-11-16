#!/bin/bash
set -e

echo "🧪 Testing AlphaBot Service.rs Implementation"
echo "=============================================="
echo ""

# Check prerequisites
if [ -z "$SCHEMATRON_API_KEY" ]; then
  echo "⚠️  Warning: SCHEMATRON_API_KEY not set"
  echo "   Set it with: export SCHEMATRON_API_KEY='sk-...'"
  echo ""
fi

# Phase 1: Build & Deploy
echo "📦 Phase 1: Build & Deploy"
echo "--------------------------"
cd contracts/bot-state
echo "Checking compilation..."
cargo check || { echo "❌ Cargo check failed"; exit 1; }
cd ../..

echo "Deploying bot..."
make deploy-bot-simple-ma || { echo "❌ Deployment failed"; exit 1; }

# Get App ID and GraphQL endpoint
APP_ID=$(grep "App ID:" infra/localnet/deployed-bots.txt | tail -1 | awk '{print $3}')
GRAPHQL_URL=$(grep "GraphQL:" infra/localnet/deployed-bots.txt | tail -1 | awk '{print $2}')
echo "✅ App ID: $APP_ID"
echo "✅ GraphQL: $GRAPHQL_URL"
echo ""

# Start Linera service (required for GraphQL queries)
echo "🚀 Starting Linera service..."
export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"
linera service --port 8081 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
echo "✅ Service started (PID: $SERVICE_PID)"
sleep 3
echo ""

# Phase 2: GraphQL API
echo "🔍 Phase 2: GraphQL API Testing"
echo "--------------------------------"

echo "Test 2.1: Query bot state..."
RESULT=$(curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ botId }"}')
echo "$RESULT" | grep -q "alphabot-simple-ma" || { echo "❌ Query failed: $RESULT"; kill $SERVICE_PID; exit 1; }
echo "✅ Bot state query successful"
echo "$RESULT"
echo ""

if [ -n "$SCHEMATRON_API_KEY" ]; then
  echo "Test 2.2: Execute prediction..."
  RESULT=$(curl -s -X POST "$GRAPHQL_URL" \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { executePrediction(strategy: \"schematron\", apiKey: \"'"$SCHEMATRON_API_KEY"'\") { action predictedPriceMicro confidenceBps } }"}')
  echo "$RESULT" | grep -q "action" || { echo "❌ Prediction failed: $RESULT"; kill $SERVICE_PID; exit 1; }
  echo "✅ Prediction executed successfully"
  echo "$RESULT"
  echo ""

  echo "Test 2.3: Verify signal stored..."
  RESULT=$(curl -s -X POST "$GRAPHQL_URL" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ latestSignal { action predictedPriceMicro } }"}')
  echo "$RESULT" | grep -q "action" || { echo "❌ Signal query failed: $RESULT"; kill $SERVICE_PID; exit 1; }
  echo "✅ Signal stored on-chain"
  echo "$RESULT"
else
  echo "⏭️  Skipping Test 2.2 & 2.3 (no API key)"
fi

# Cleanup
echo ""
echo "🧹 Stopping service..."
kill $SERVICE_PID 2>/dev/null || true

echo ""
echo "✅ Basic tests complete!"
echo ""
echo "📋 For full test suite, see: INTEGRATION_TEST_PLAN.md"
echo "   Open and follow the checklist, pasting results as you go."
