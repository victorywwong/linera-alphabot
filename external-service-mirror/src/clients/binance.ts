import fetch from 'node-fetch';
import type { Binance24hrTicker, BinanceKline } from '../types/index.js';

/**
 * Binance API HTTP client
 * Fetches market data from Binance public API
 */
export class BinanceClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://api.binance.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch 24hr ticker data
   * Endpoint: GET /api/v3/ticker/24hr
   */
  async get24hrTicker(symbol: string): Promise<Binance24hrTicker> {
    const url = `${this.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    // Binance returns the exact format we need
    return data as Binance24hrTicker;
  }

  /**
   * Fetch kline/candlestick data
   * Endpoint: GET /api/v3/klines
   */
  async getKlines(symbol: string, interval: string, limit: number): Promise<BinanceKline[]> {
    const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid Binance klines response: expected array');
    }

    // Binance returns array of tuples matching our BinanceKline type
    return data as BinanceKline[];
  }

  /**
   * Fetch with retry logic and exponential backoff
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
        // Exponential backoff: 1s, 2s, 4s
        await this.delay(Math.pow(2, i) * 1000);
      }
    }

    throw new Error('Fetch retry exhausted');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
