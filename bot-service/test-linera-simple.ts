#!/usr/bin/env -S npx tsx
/**
 * Simple Linera integration test with mock data
 * Tests submitPrediction and getBotState without external API dependencies
 */

import { LineraClient, type LineraConfig } from './src/clients/linera';
import { Action, type Signal } from './src/types';

// Contract configuration from CONTRACT_VERIFIED.md
const LINERA_CONFIG: LineraConfig = {
  endpoint: 'http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/applications/cbb593ca83c1327d57cf63e9996dee36811b3d9576592536bca4d41791c2f0e7',
  applicationId: 'cbb593ca83c1327d57cf63e9996dee36811b3d9576592536bca4d41791c2f0e7',
  chainId: 'bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4',
  timeout: 30_000,
};

async function main() {
  console.log('🧪 Simple Linera Integration Test\n');
  console.log('━'.repeat(60));

  // Initialize client
  console.log('\n📡 Initializing Linera client...');
  const lineraClient = new LineraClient(LINERA_CONFIG);

  // Create a test signal with mock data
  const mockSignal: Signal = {
    timestamp: Date.now(),
    action: Action.BUY,
    predicted_price: 3550.50,  // USD
    confidence: 0.87,           // 87%
    reasoning: 'MCP Integration Test - Mock signal with fixed-point conversion',
  };

  console.log('\n🤖 Mock prediction generated:');
  console.log(`  Action: ${mockSignal.action}`);
  console.log(`  Predicted price: $${mockSignal.predicted_price.toFixed(2)}`);
  console.log(`  Confidence: ${(mockSignal.confidence * 100).toFixed(1)}%`);
  console.log(`  Reasoning: ${mockSignal.reasoning}`);

  // Test conversion functions
  console.log('\n🔢 Testing fixed-point conversions:');
  const { toMicroUSD, toBasisPoints } = await import('./src/clients/linera');
  const priceMicro = toMicroUSD(mockSignal.predicted_price);
  const confidenceBps = toBasisPoints(mockSignal.confidence);
  console.log(`  USD ${mockSignal.predicted_price} → micro-USD ${priceMicro}`);
  console.log(`  Confidence ${mockSignal.confidence} → basis points ${confidenceBps}`);

  // Submit to contract
  console.log('\n🔗 Submitting prediction to Linera contract...');
  const submitResult = await lineraClient.submitPrediction(mockSignal);

  if (!submitResult.success) {
    console.error(`  ❌ Failed to submit: ${submitResult.error}`);
    process.exit(1);
  }

  console.log('  ✅ Prediction submitted successfully!');

  // Query contract to verify
  console.log('\n🔍 Querying contract to verify submission...');
  const state = await lineraClient.getBotState();

  if (!state) {
    console.error('  ❌ Failed to query bot state');
    process.exit(1);
  }

  console.log(`  Bot ID: ${state.botId}`);

  if (state.latestSignal) {
    console.log('\n  Latest Signal (converted back from contract):');
    console.log(`    - Timestamp: ${new Date(state.latestSignal.timestamp).toISOString()}`);
    console.log(`    - Action: ${state.latestSignal.action}`);
    console.log(`    - Predicted Price: $${state.latestSignal.predicted_price.toFixed(2)}`);
    console.log(`    - Confidence: ${(state.latestSignal.confidence * 100).toFixed(1)}%`);
    console.log(`    - Reasoning: ${state.latestSignal.reasoning}`);

    // Verify round-trip conversion
    const priceDiff = Math.abs(state.latestSignal.predicted_price - mockSignal.predicted_price);
    const confidenceDiff = Math.abs(state.latestSignal.confidence - mockSignal.confidence);

    console.log('\n  Round-trip validation:');
    if (priceDiff < 0.01) {
      console.log(`    ✅ Price conversion accurate (diff: $${priceDiff.toFixed(6)})`);
    } else {
      console.log(`    ❌ Price conversion error (diff: $${priceDiff.toFixed(6)})`);
    }

    if (confidenceDiff < 0.0001) {
      console.log(`    ✅ Confidence conversion accurate (diff: ${confidenceDiff.toFixed(6)})`);
    } else {
      console.log(`    ❌ Confidence conversion error (diff: ${confidenceDiff.toFixed(6)})`);
    }
  } else {
    console.log('  ⚠️  No latest signal found');
  }

  console.log('\n━'.repeat(60));
  console.log('✅ Integration test completed successfully!\n');
}

main().catch((error) => {
  console.error('\n❌ Integration test failed:', error);
  console.error('\nError details:', error.message);
  if (error.stack) {
    console.error('\nStack trace:', error.stack);
  }
  process.exit(1);
});
