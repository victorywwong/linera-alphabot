import { Action, type Signal, type Strategy, type MarketSnapshot } from '../types/index.js';

/**
 * Simple Moving Average Strategy for Wave 1
 *
 * Uses SMA20 and SMA50 crossover to generate signals:
 * - BUY when SMA20 > SMA50 by 2% (golden cross)
 * - SELL when SMA20 < SMA50 by 2% (death cross)
 * - HOLD when SMAs are close (within 2%)
 */
export class SimpleMAStrategy implements Strategy {
  readonly name = 'simple-ma';

  async predict(data: MarketSnapshot): Promise<Signal> {
    const { currentPrice, priceHistory, timestamp } = data;

    // Extract prices from history
    const prices = priceHistory.map((p) => p.price);

    // Calculate moving averages
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);

    // Determine action based on SMA crossover
    const { action, confidence } = this.determineAction(sma20, sma50);

    // Predict price based on SMA20 trend
    const predicted_price = this.predictPrice(currentPrice, sma20, sma50, action);

    // Generate reasoning
    const reasoning = this.generateReasoning(sma20, sma50, action, currentPrice);

    return {
      timestamp,
      action,
      predicted_price,
      confidence,
      reasoning,
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      // Not enough data, use available data
      period = prices.length;
    }

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Determine trading action and confidence
   */
  private determineAction(sma20: number, sma50: number): { action: Action; confidence: number } {
    const spread = (sma20 - sma50) / sma50;

    if (spread > 0.02) {
      // SMA20 is 2%+ above SMA50: strong buy signal
      return {
        action: Action.BUY,
        confidence: Math.min(0.5 + spread * 5, 0.9), // 0.5-0.9 based on spread
      };
    } else if (spread < -0.02) {
      // SMA20 is 2%+ below SMA50: strong sell signal
      return {
        action: Action.SELL,
        confidence: Math.min(0.5 + Math.abs(spread) * 5, 0.9),
      };
    } else {
      // SMAs converged: hold signal
      return {
        action: Action.HOLD,
        confidence: 0.5,
      };
    }
  }

  /**
   * Predict future price based on trend
   */
  private predictPrice(
    currentPrice: number,
    sma20: number,
    sma50: number,
    action: Action
  ): number {
    const trend = (sma20 - sma50) / sma50;

    switch (action) {
      case Action.BUY:
        // Predict 1-2% increase
        return currentPrice * (1 + Math.max(trend, 0.01));

      case Action.SELL:
        // Predict 1-2% decrease
        return currentPrice * (1 + Math.min(trend, -0.01));

      case Action.HOLD:
        // Predict minimal change (±0.5%)
        return currentPrice * (1 + trend * 0.5);
    }
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    sma20: number,
    sma50: number,
    action: Action,
    currentPrice: number
  ): string {
    const spread = ((sma20 - sma50) / sma50) * 100;
    const trend = action === Action.BUY ? 'bullish' : action === Action.SELL ? 'bearish' : 'neutral';

    return `SMA20=$${sma20.toFixed(2)} vs SMA50=$${sma50.toFixed(2)} (${spread > 0 ? '+' : ''}${spread.toFixed(2)}%). ${trend.charAt(0).toUpperCase() + trend.slice(1)} trend. Current=$${currentPrice.toFixed(2)}`;
  }
}
