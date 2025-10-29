#!/usr/bin/env -S npx tsx
/**
 * Integration test script
 * Tests the full MCP → Linera flow with real market data
 */

import { CoinGeckoFetcher } from './src/fetchers/coingecko';
import { SimpleMAStrategy } from './src/strategies/simple-ma';
import { LineraClient, type LineraConfig } from './src/clients/linera';

// Contract configuration from CONTRACT_VERIFIED.md
const LINERA_CONFIG: LineraConfig = {
  endpoint: 'http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/applications/cbb593ca83c1327d57cf63e9996dee36811b3d9576592536bca4d41791c2f0e7/graphql',
  applicationId: 'cbb593ca83c1327d57cf63e9996dee36811b3d9576592536bca4d41791c2f0e7',
  chainId: 'bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4',
  timeout: 30_000,
};

async function main() {
  console.log('🧪 MCP Integration Test\n');
  console.log('━'.repeat(60));

  // Step 1: Initialize clients
  console.log('\n📡 Initializing clients...');
  const fetcher = new CoinGeckoFetcher('https://api.coingecko.com/api/v3');
  const strategy = new SimpleMAStrategy();
  const lineraClient = new LineraClient(LINERA_CONFIG);

  // Step 2: Fetch market data
  console.log('📊 Fetching market snapshot from CoinGecko...');
  const snapshot = await fetcher.getMarketSnapshot();
  console.log(`  Current ETH price: $${snapshot.currentPrice.toFixed(2)}`);
  console.log(`  24h change: ${snapshot.change24h.toFixed(2)}%`);
  console.log(`  24h volume: $${(snapshot.volume24h / 1e9).toFixed(2)}B`);

  // Step 3: Generate prediction
  console.log('\n🤖 Generating prediction via SimpleMA strategy...');
  const signal = await strategy.predict(snapshot);
  console.log(`  Action: ${signal.action}`);
  console.log(`  Predicted price: $${signal.predicted_price.toFixed(2)}`);
  console.log(`  Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
  console.log(`  Reasoning: ${signal.reasoning}`);

  // Step 4: Submit to contract
  console.log('\n🔗 Submitting prediction to Linera contract...');
  const submitResult = await lineraClient.submitPrediction(signal);

  if (!submitResult.success) {
    console.error(`  ❌ Failed to submit: ${submitResult.error}`);
    process.exit(1);
  }

  console.log('  ✅ Prediction submitted successfully!');
  if (submitResult.certificateHash) {
    console.log(`  Certificate: ${submitResult.certificateHash}`);
  }

  // Step 5: Query contract to verify
  console.log('\n🔍 Querying contract to verify submission...');
  const state = await lineraClient.getBotState();

  if (!state) {
    console.error('  ❌ Failed to query bot state');
    process.exit(1);
  }

  console.log(`  Bot ID: ${state.botId}`);

  if (state.latestSignal) {
    console.log('  Latest Signal:');
    console.log(`    - Timestamp: ${new Date(state.latestSignal.timestamp).toISOString()}`);
    console.log(`    - Action: ${state.latestSignal.action}`);
    console.log(`    - Predicted Price: $${state.latestSignal.predicted_price.toFixed(2)}`);
    console.log(`    - Confidence: ${(state.latestSignal.confidence * 100).toFixed(1)}%`);
    console.log(`    - Reasoning: ${state.latestSignal.reasoning}`);
  } else {
    console.log('  No latest signal found');
  }

  console.log(`  Follower Count: ${state.followerCount}`);
  console.log(`  Accuracy (24h):`);
  console.log(`    - RMSE: $${state.accuracy24h.rmse.toFixed(2)}`);
  console.log(`    - Directional: ${(state.accuracy24h.directionalAccuracy * 100).toFixed(1)}%`);
  console.log(`    - Total Predictions: ${state.accuracy24h.totalPredictions}`);
  console.log(`    - Correct Predictions: ${state.accuracy24h.correctPredictions}`);

  console.log('\n━'.repeat(60));
  console.log('✅ Integration test completed successfully!\n');
}

main().catch((error) => {
  console.error('\n❌ Integration test failed:', error);
  process.exit(1);
});
