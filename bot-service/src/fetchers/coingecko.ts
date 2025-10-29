import fetch from 'node-fetch';
import {
  CoinGeckoPriceSchema,
  CoinGeckoHistorySchema,
  type CoinGeckoPrice,
  type CoinGeckoHistory,
  type MarketSnapshot,
  type PricePoint,
} from '../types/index.js';

export class CoinGeckoFetcher {
  private baseUrl: string;
  private apiKey?: string;
  private cache: Map<string, { data: unknown; expiry: number }>;
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.cache = new Map();
  }

  /**
   * Fetch current ETH price and market data
   */
  async getCurrentPrice(): Promise<CoinGeckoPrice> {
    const cacheKey = 'current-price';
    const cached = this.getFromCache<CoinGeckoPrice>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/simple/price`);
    url.searchParams.set('ids', 'ethereum');
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_market_cap', 'true');
    url.searchParams.set('include_24hr_vol', 'true');
    url.searchParams.set('include_24hr_change', 'true');

    const response = await this.fetchWithRetry(url.toString());
    const data = await response.json();

    const validated = CoinGeckoPriceSchema.parse(data);
    this.setCache(cacheKey, validated);

    return validated;
  }

  /**
   * Fetch historical price data
   */
  async getHistoricalPrices(days: number): Promise<CoinGeckoHistory> {
    const cacheKey = `history-${days}`;
    const cached = this.getFromCache<CoinGeckoHistory>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/coins/ethereum/market_chart`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('days', days.toString());
    // Note: interval is auto-determined by CoinGecko based on days value
    // Don't set interval parameter explicitly for Demo/Free tier

    const response = await this.fetchWithRetry(url.toString());
    const data = await response.json();

    const validated = CoinGeckoHistorySchema.parse(data);
    this.setCache(cacheKey, validated);

    return validated;
  }

  /**
   * Build a complete market snapshot for strategy input
   */
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const [currentData, historyData] = await Promise.all([
      this.getCurrentPrice(),
      this.getHistoricalPrices(7), // Last 7 days for moving averages
    ]);

    const priceHistory: PricePoint[] = historyData.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
      volume: historyData.total_volumes?.find(([t]) => t === timestamp)?.[1],
    }));

    return {
      timestamp: Date.now(),
      currentPrice: currentData.ethereum.usd,
      priceHistory,
      volume24h: currentData.ethereum.usd_24h_vol || 0,
      change24h: currentData.ethereum.usd_24h_change || 0,
      marketCap: currentData.ethereum.usd_market_cap,
    };
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-cg-demo-api-key'] = this.apiKey;
    }

    // Debug logging
    console.log('[CoinGeckoFetcher] Request URL:', url);
    console.log('[CoinGeckoFetcher] API Key present:', !!this.apiKey);
    console.log('[CoinGeckoFetcher] Headers:', JSON.stringify(headers, null, 2));

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
          const body = await response.text();
          console.log('[CoinGeckoFetcher] Error response body:', body);
          throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
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
