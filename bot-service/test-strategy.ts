#!/usr/bin/env -S npx tsx
/**
 * Test SimpleMA strategy with mock data
 */

import { SimpleMAStrategy } from './src/strategies/simple-ma';
import type { MarketSnapshot } from './src/types';

async function main() {
  console.log('🧪 Testing SimpleMA Strategy\n');

  const strategy = new SimpleMAStrategy();

  // Create mock market data with upward trend
  const mockSnapshot: MarketSnapshot = {
    timestamp: Date.now(),
    currentPrice: 3500,
    volume24h: 15_000_000_000,
    change24h: 2.5,
    priceHistory: [
      // 50 hours of data showing upward trend
      ...Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (50 - i) * 3600000,
        price: 3300 + i * 5, // Gradually increasing from 3300 to 3450
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (20 - i) * 3600000,
        price: 3450 + i * 2.5, // Recent acceleration to 3500
      })),
    ],
  };

  console.log('📊 Mock Market Data:');
  console.log(`  Current Price: $${mockSnapshot.currentPrice.toFixed(2)}`);
  console.log(`  24h Volume: $${(mockSnapshot.volume24h / 1e9).toFixed(2)}B`);
  console.log(`  24h Change: ${mockSnapshot.change24h.toFixed(2)}%`);
  console.log(`  Price History: ${mockSnapshot.priceHistory.length} hours`);

  console.log('\n🤖 Generating prediction...');
  const signal = await strategy.predict(mockSnapshot);

  console.log('\n✅ Prediction Generated:');
  console.log(`  Action: ${signal.action}`);
  console.log(`  Predicted Price: $${signal.predicted_price.toFixed(2)}`);
  console.log(`  Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
  console.log(`  Reasoning: ${signal.reasoning}`);
  console.log(`  Timestamp: ${new Date(signal.timestamp).toISOString()}`);

  console.log('\n✅ SimpleMA strategy working correctly!\n');
}

main().catch(console.error);
