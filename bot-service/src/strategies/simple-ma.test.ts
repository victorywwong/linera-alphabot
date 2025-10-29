import { describe, it, expect } from 'vitest';
import { SimpleMAStrategy } from './simple-ma.js';
import { Action, type MarketSnapshot } from '../types/index.js';

describe('SimpleMAStrategy', () => {
  const strategy = new SimpleMAStrategy();

  // Helper to create market snapshot with specific price history
  const createSnapshot = (prices: number[]): MarketSnapshot => ({
    timestamp: Date.now(),
    currentPrice: prices[prices.length - 1],
    priceHistory: prices.map((price, i) => ({
      timestamp: Date.now() - (prices.length - i) * 3600000, // Hourly intervals
      price,
    })),
    volume24h: 1000000,
    change24h: 0,
  });

  describe('BUY signal', () => {
    it('should signal BUY when SMA20 > SMA50 by more than 2%', async () => {
      // Create uptrend: SMA20 will be higher than SMA50
      const prices = [
        // Initial low prices (for SMA50)
        ...Array(30).fill(2000),
        // Recent high prices (for SMA20)
        ...Array(20).fill(2100), // 5% increase
      ];

      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.action).toBe(Action.BUY);
      expect(signal.confidence).toBeGreaterThan(0.5);
      expect(signal.predicted_price).toBeGreaterThan(snapshot.currentPrice);
      expect(signal.reasoning).toContain('Bullish');
    });

    it('should have higher confidence for larger SMA spread', async () => {
      const snapshot1 = createSnapshot([
        ...Array(30).fill(2000),
        ...Array(20).fill(2050), // Small spread
      ]);

      const snapshot2 = createSnapshot([
        ...Array(30).fill(2000),
        ...Array(20).fill(2150), // Large spread
      ]);

      const signal1 = await strategy.predict(snapshot1);
      const signal2 = await strategy.predict(snapshot2);

      expect(signal2.confidence).toBeGreaterThan(signal1.confidence);
    });
  });

  describe('SELL signal', () => {
    it('should signal SELL when SMA20 < SMA50 by more than 2%', async () => {
      // Create downtrend: SMA20 will be lower than SMA50
      const prices = [
        // Initial high prices (for SMA50)
        ...Array(30).fill(2100),
        // Recent low prices (for SMA20)
        ...Array(20).fill(2000), // 4.7% decrease
      ];

      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.action).toBe(Action.SELL);
      expect(signal.confidence).toBeGreaterThan(0.5);
      expect(signal.predicted_price).toBeLessThan(snapshot.currentPrice);
      expect(signal.reasoning).toContain('Bearish');
    });
  });

  describe('HOLD signal', () => {
    it('should signal HOLD when SMAs are within 2% of each other', async () => {
      // Stable prices: SMAs will be close
      const prices = Array(50).fill(2000);

      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.action).toBe(Action.HOLD);
      expect(signal.confidence).toBe(0.5);
      expect(Math.abs(signal.predicted_price - snapshot.currentPrice)).toBeLessThan(
        snapshot.currentPrice * 0.01
      );
      expect(signal.reasoning).toContain('Neutral');
    });

    it('should signal HOLD for slight uptrend within threshold', async () => {
      // Slight uptrend but below 2% threshold
      const prices = [
        ...Array(30).fill(2000),
        ...Array(20).fill(2025), // 1.25% increase
      ];

      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.action).toBe(Action.HOLD);
    });
  });

  describe('Edge cases', () => {
    it('should handle insufficient data for SMA50', async () => {
      // Only 30 data points (less than 50)
      const prices = Array(30)
        .fill(0)
        .map((_, i) => 2000 + i * 10); // Uptrend

      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      // Should still produce valid signal
      expect([Action.BUY, Action.SELL, Action.HOLD]).toContain(signal.action);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.predicted_price).toBeGreaterThan(0);
    });

    it('should produce valid reasoning under 512 chars', async () => {
      const prices = Array(50).fill(2000);
      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.reasoning.length).toBeLessThanOrEqual(512);
      expect(signal.reasoning).toContain('SMA20');
      expect(signal.reasoning).toContain('SMA50');
    });

    it('should include timestamp from snapshot', async () => {
      const prices = Array(50).fill(2000);
      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      expect(signal.timestamp).toBe(snapshot.timestamp);
    });
  });

  describe('Price prediction accuracy', () => {
    it('should predict higher price for BUY signal', async () => {
      const prices = [...Array(30).fill(2000), ...Array(20).fill(2100)];
      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      if (signal.action === Action.BUY) {
        const increase = (signal.predicted_price - snapshot.currentPrice) / snapshot.currentPrice;
        expect(increase).toBeGreaterThan(0);
        expect(increase).toBeLessThan(0.05); // Should be reasonable (< 5%)
      }
    });

    it('should predict lower price for SELL signal', async () => {
      const prices = [...Array(30).fill(2100), ...Array(20).fill(2000)];
      const snapshot = createSnapshot(prices);
      const signal = await strategy.predict(snapshot);

      if (signal.action === Action.SELL) {
        const decrease = (snapshot.currentPrice - signal.predicted_price) / snapshot.currentPrice;
        expect(decrease).toBeGreaterThan(0);
        expect(decrease).toBeLessThan(0.05);
      }
    });
  });
});
