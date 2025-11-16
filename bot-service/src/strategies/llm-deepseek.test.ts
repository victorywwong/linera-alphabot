import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepSeekStrategy } from './llm-deepseek';
import { Action, type MarketSnapshot } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

const mockMarketSnapshot: MarketSnapshot = {
  timestamp: Date.now(),
  currentPrice: 3500,
  change24h: 2.5,
  volume24h: 15000000000,
  priceHistory: Array.from({ length: 50 }, (_, i) => {
    const close = 3500 - i * 10;
    const open = close - 5 + Math.random() * 10;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    return {
      timestamp: Date.now() - i * 3600000,
      open,
      high,
      low,
      close,
      volume: 1000000 + Math.random() * 500000,
      price: close, // Alias for backward compatibility
    };
  }),
};

describe('DeepSeekStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variable for tests
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
  });

  describe('Initialization', () => {
    it('should throw error if DEEPSEEK_API_KEY is not set', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => new DeepSeekStrategy()).toThrow(
        'DEEPSEEK_API_KEY is required'
      );
    });

    it('should initialize with correct defaults', () => {
      const strategy = new DeepSeekStrategy();
      expect(strategy.name).toBe('deepseek');
    });
  });

  describe('Prediction', () => {
    it('should successfully parse BUY signal', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: BUY
PRICE: 3575.50
CONFIDENCE: 78
REASONING: Strong upward momentum with increasing volume.`,
              },
            },
          ],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      expect(signal.action).toBe(Action.BUY);
      expect(signal.predicted_price).toBe(3575.5);
      expect(signal.confidence).toBe(0.78);
      expect(signal.reasoning).toContain('Strong upward momentum');
      expect(signal.timestamp).toBe(mockMarketSnapshot.timestamp);
    });

    it('should successfully parse SELL signal', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: SELL
PRICE: 3425.00
CONFIDENCE: 65
REASONING: Bearish momentum detected.`,
              },
            },
          ],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      expect(signal.action).toBe(Action.SELL);
      expect(signal.predicted_price).toBe(3425);
      expect(signal.confidence).toBe(0.65);
    });

    it('should successfully parse HOLD signal', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: HOLD
PRICE: 3500.00
CONFIDENCE: 50
REASONING: Sideways movement expected.`,
              },
            },
          ],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      expect(signal.action).toBe(Action.HOLD);
      expect(signal.predicted_price).toBe(3500);
      expect(signal.confidence).toBe(0.5);
    });

    it('should handle API errors gracefully', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      // Should fallback to HOLD
      expect(signal.action).toBe(Action.HOLD);
      expect(signal.predicted_price).toBe(mockMarketSnapshot.currentPrice);
      expect(signal.confidence).toBe(0.1);
      expect(signal.reasoning).toContain('Error during prediction');
    });

    it('should handle empty response gracefully', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      // Should fallback to HOLD
      expect(signal.action).toBe(Action.HOLD);
      expect(signal.confidence).toBe(0.1);
    });

    it('should clamp confidence to valid range', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: BUY
PRICE: 3575.50
CONFIDENCE: 150
REASONING: Test`,
              },
            },
          ],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      // Should clamp to max 1.0
      expect(signal.confidence).toBe(1.0);
    });

    it('should use current price as fallback for invalid predicted price', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: BUY
PRICE: invalid
CONFIDENCE: 75
REASONING: Test`,
              },
            },
          ],
        }),
      });

      const signal = await strategy.predict(mockMarketSnapshot);

      expect(signal.predicted_price).toBe(mockMarketSnapshot.currentPrice);
    });
  });

  describe('API Request', () => {
    it('should call DeepSeek API with correct parameters', async () => {
      const strategy = new DeepSeekStrategy();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: `ACTION: HOLD\nPRICE: 3500\nCONFIDENCE: 50\nREASONING: Test`,
              },
            },
          ],
        }),
      });

      await strategy.predict(mockMarketSnapshot);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const call = (global.fetch as any).mock.calls[0];

      expect(call[0]).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(call[1].method).toBe('POST');
      expect(call[1].headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      });

      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('deepseek-chat');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1024);
    });
  });
});
