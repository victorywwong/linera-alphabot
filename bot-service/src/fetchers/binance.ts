import fetch from 'node-fetch';
import {
  Binance24hrTickerSchema,
  BinanceKlineSchema,
  type Binance24hrTicker,
  type BinanceKline,
  type MarketSnapshot,
  type PricePoint,
} from '../types/index.js';

export class BinanceFetcher {
  private baseUrl: string;
  private cache: Map<string, { data: unknown; expiry: number }>;
  private readonly CACHE_TTL = 10 * 1000; // 10 seconds for current price

  constructor(baseUrl = 'https://api.binance.com') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  /**
   * Fetch current ETH/USDT price and 24h stats
   */
  async getCurrentPrice(): Promise<Binance24hrTicker> {
    const cacheKey = 'current-price';
    const cached = this.getFromCache<Binance24hrTicker>(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/api/v3/ticker/24hr?symbol=ETHUSDT`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    const validated = Binance24hrTickerSchema.parse(data);
    this.setCache(cacheKey, validated);

    return validated;
  }

  /**
   * Fetch historical kline/candlestick data
   * @param interval - 1m, 5m, 15m, 1h, 4h, 1d, etc.
   * @param limit - Number of klines to fetch (max 1000)
   */
  async getKlines(interval = '1h', limit = 168): Promise<BinanceKline[]> {
    const cacheKey = `klines-${interval}-${limit}`;
    const cached = this.getFromCache<BinanceKline[]>(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/api/v3/klines?symbol=ETHUSDT&interval=${interval}&limit=${limit}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid Binance klines response');
    }

    const validated = data.map((kline) => BinanceKlineSchema.parse(kline));
    this.setCache(cacheKey, validated);

    return validated;
  }

  /**
   * Build a complete market snapshot for strategy input
   */
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const [currentData, klines] = await Promise.all([
      this.getCurrentPrice(),
      this.getKlines('1h', 200), // Last 200 hours (~8 days) of hourly OHLC data
    ]);

    const currentPrice = parseFloat(currentData.lastPrice);
    const volume24h = parseFloat(currentData.quoteVolume);
    const change24h = parseFloat(currentData.priceChangePercent);

    // Convert klines to PricePoint[] with full OHLC data
    const priceHistory: PricePoint[] = klines.map((kline) => {
      const close = parseFloat(kline[4]);
      return {
        timestamp: kline[0], // Open time
        open: parseFloat(kline[1]), // Open price
        high: parseFloat(kline[2]), // High price
        low: parseFloat(kline[3]), // Low price
        close, // Close price
        volume: parseFloat(kline[5]), // Volume
        price: close, // Alias for backward compatibility
      };
    });

    return {
      timestamp: Date.now(),
      currentPrice,
      priceHistory,
      volume24h,
      change24h,
      // Binance doesn't provide market cap, leave undefined
    };
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        return response as unknown as Response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }

    throw new Error('Fetch retry exhausted');
  }

  /**
   * Cache helpers
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
