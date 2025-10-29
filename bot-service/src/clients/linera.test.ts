import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LineraClient, type LineraConfig } from './linera';
import { Action, type Signal } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

describe('LineraClient', () => {
  let client: LineraClient;
  let config: LineraConfig;

  beforeEach(() => {
    config = {
      endpoint: 'http://localhost:8080/graphql',
      applicationId: 'test-app-id',
      chainId: 'test-chain-id',
      timeout: 5000,
    };
    client = new LineraClient(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with provided config', () => {
      const clientConfig = client.getConfig();
      expect(clientConfig.endpoint).toBe(config.endpoint);
      expect(clientConfig.applicationId).toBe(config.applicationId);
      expect(clientConfig.chainId).toBe(config.chainId);
    });

    it('should use default timeout if not provided', () => {
      const clientWithoutTimeout = new LineraClient({
        endpoint: 'http://localhost:8080',
        applicationId: 'app',
        chainId: 'chain',
      });
      expect(clientWithoutTimeout.getConfig().timeout).toBeUndefined();
    });
  });

  describe('submitPrediction', () => {
    it('should submit prediction successfully', async () => {
      const signal: Signal = {
        timestamp: Date.now(),
        action: Action.BUY,
        predicted_price: 2500,
        confidence: 0.75,
        reasoning: 'Test signal',
      };

      const mockResponse = {
        data: {
          submitPrediction: true,
        },
        certificateHash: 'hash123',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.submitPrediction(signal);

      expect(result.success).toBe(true);
      expect(result.certificateHash).toBe('hash123');
      expect(fetch).toHaveBeenCalledWith(
        config.endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle HTTP errors', async () => {
      const signal: Signal = {
        timestamp: Date.now(),
        action: Action.BUY,
        predicted_price: 2500,
        confidence: 0.75,
        reasoning: 'Test',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await client.submitPrediction(signal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle GraphQL errors', async () => {
      const signal: Signal = {
        timestamp: Date.now(),
        action: Action.SELL,
        predicted_price: 2000,
        confidence: 0.6,
        reasoning: 'Test',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Validation failed' }],
        }),
      } as Response);

      const result = await client.submitPrediction(signal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('GraphQL errors');
    });

    it('should handle network timeout', async () => {
      const signal: Signal = {
        timestamp: Date.now(),
        action: Action.HOLD,
        predicted_price: 2100,
        confidence: 0.5,
        reasoning: 'Test',
      };

      vi.mocked(fetch).mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      const result = await client.submitPrediction(signal);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('resolveSignal', () => {
    it('should resolve signal successfully', async () => {
      const timestamp = Date.now();
      const actualPrice = 2550;

      const mockResponse = {
        data: {
          resolveSignal: true,
        },
        certificateHash: 'hash456',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.resolveSignal(timestamp, actualPrice);

      expect(result.success).toBe(true);
      expect(result.certificateHash).toBe('hash456');
    });

    it('should handle resolution errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await client.resolveSignal(123456, 2000);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getBotState', () => {
    it('should query bot state successfully', async () => {
      const mockState = {
        data: {
          botId: 'momentum-bot',
          latestSignal: {
            timestamp: Date.now(),
            action: 'BUY',
            predictedPrice: 2500,
            confidence: 0.75,
            reasoning: 'Bullish trend',
            actualPrice: null,
          },
          accuracy24h: {
            rmse: 50.5,
            directionalAccuracy: 65.0,
            totalPredictions: 20,
            correctPredictions: 13,
            lastUpdated: Date.now(),
          },
          followerCount: 42,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockState,
      } as Response);

      const state = await client.getBotState();

      expect(state).toBeDefined();
      expect(state?.botId).toBe('momentum-bot');
      expect(state?.followerCount).toBe(42);
      expect(state?.accuracy24h.directionalAccuracy).toBe(65.0);
    });

    it('should return null on query error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      } as Response);

      const state = await client.getBotState();

      expect(state).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      client.updateConfig({ endpoint: 'http://newhost:9000/graphql' });

      const updated = client.getConfig();
      expect(updated.endpoint).toBe('http://newhost:9000/graphql');
      expect(updated.applicationId).toBe(config.applicationId); // Unchanged
    });

    it('should return a copy of config', () => {
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('Action Conversion', () => {
    it('should convert all action types correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const actions = [Action.BUY, Action.SELL, Action.HOLD];

      for (const action of actions) {
        const signal: Signal = {
          timestamp: Date.now(),
          action,
          predicted_price: 2000,
          confidence: 0.5,
          reasoning: 'Test',
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { submitPrediction: true } }),
        } as Response);

        const result = await client.submitPrediction(signal);
        expect(result.success).toBe(true);
      }

      consoleSpy.mockRestore();
    });
  });
});
