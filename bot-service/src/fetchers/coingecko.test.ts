import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoinGeckoFetcher } from './coingecko.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

describe('CoinGeckoFetcher', () => {
  let fetcher: CoinGeckoFetcher;

  beforeEach(() => {
    fetcher = new CoinGeckoFetcher('https://api.coingecko.com/api/v3');
    vi.clearAllMocks();
  });

  describe('getCurrentPrice', () => {
    it('should fetch and parse current price data', async () => {
      const mockResponse = {
        ethereum: {
          usd: 2500.5,
          usd_market_cap: 300000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetcher.getCurrentPrice();

      expect(result.ethereum.usd).toBe(2500.5);
      expect(result.ethereum.usd_24h_change).toBe(2.5);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should use cached data on subsequent calls', async () => {
      const mockResponse = {
        ethereum: {
          usd: 2500.5,
          usd_market_cap: 300000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // First call
      await fetcher.getCurrentPrice();

      // Second call (should use cache)
      await fetcher.getCurrentPrice();

      // Should only have called fetch once
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should retry on failure', async () => {
      const mockResponse = {
        ethereum: {
          usd: 2500.5,
          usd_market_cap: 300000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5,
        },
      };

      // Fail twice, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await fetcher.getCurrentPrice();

      expect(result.ethereum.usd).toBe(2500.5);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after exhausting retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetcher.getCurrentPrice()).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // Default retry count
    });
  });

  describe('getHistoricalPrices', () => {
    it('should fetch and parse historical price data', async () => {
      const mockResponse = {
        prices: [
          [1704067200000, 2400],
          [1704070800000, 2410],
          [1704074400000, 2420],
        ],
        market_caps: [
          [1704067200000, 290000000000],
          [1704070800000, 291000000000],
          [1704074400000, 292000000000],
        ],
        total_volumes: [
          [1704067200000, 14000000000],
          [1704070800000, 14500000000],
          [1704074400000, 15000000000],
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetcher.getHistoricalPrices(7);

      expect(result.prices).toHaveLength(3);
      expect(result.prices[0][1]).toBe(2400);
      expect(result.prices[2][1]).toBe(2420);
    });
  });

  describe('getMarketSnapshot', () => {
    it('should combine current and historical data', async () => {
      const currentMockResponse = {
        ethereum: {
          usd: 2500,
          usd_market_cap: 300000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5,
        },
      };

      const historyMockResponse = {
        prices: [
          [Date.now() - 86400000, 2400],
          [Date.now() - 43200000, 2450],
          [Date.now(), 2500],
        ],
        total_volumes: [
          [Date.now() - 86400000, 14000000000],
          [Date.now() - 43200000, 14500000000],
          [Date.now(), 15000000000],
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => currentMockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => historyMockResponse,
        } as Response);

      const snapshot = await fetcher.getMarketSnapshot();

      expect(snapshot.currentPrice).toBe(2500);
      expect(snapshot.volume24h).toBe(15000000000);
      expect(snapshot.change24h).toBe(2.5);
      expect(snapshot.priceHistory).toHaveLength(3);
      expect(snapshot.priceHistory[0].price).toBe(2400);
    });
  });

  describe('API key handling', () => {
    it('should include API key in headers when provided', async () => {
      const fetcherWithKey = new CoinGeckoFetcher(
        'https://api.coingecko.com/api/v3',
        'test-api-key'
      );

      const mockResponse = {
        ethereum: {
          usd: 2500,
          usd_market_cap: 300000000000,
          usd_24h_vol: 15000000000,
          usd_24h_change: 2.5,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await fetcherWithKey.getCurrentPrice();

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['x-cg-pro-api-key']).toBe('test-api-key');
    });
  });
});
