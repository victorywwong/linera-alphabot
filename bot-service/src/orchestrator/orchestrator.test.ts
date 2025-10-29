import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from './index';
import { Action } from '../types';
import { CoinGeckoFetcher } from '../fetchers/coingecko';
import { SimpleMAStrategy } from '../strategies/simple-ma';

// Mock the fetcher and strategy modules
vi.mock('../fetchers/coingecko');
vi.mock('../strategies/simple-ma');

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    vi.useFakeTimers();

    // Setup mocks
    vi.mocked(CoinGeckoFetcher).mockImplementation(() => ({
      getMarketSnapshot: vi.fn().mockResolvedValue({
        currentPrice: 2000,
        timestamp: Date.now(),
        prices24h: Array.from({ length: 50 }, (_, i) => ({
          price: 2000 + (i - 25) * 2,
          timestamp: Date.now() - (50 - i) * 60 * 1000,
        })),
      }),
      getCurrentPrice: vi.fn(),
    }) as any);

    vi.mocked(SimpleMAStrategy).mockImplementation(() => ({
      predict: vi.fn().mockResolvedValue({
        timestamp: Date.now(),
        action: Action.BUY,
        predicted_price: 2050,
        confidence: 0.75,
        reasoning: 'Test signal',
      }),
    }) as any);

    orchestrator = new Orchestrator({ intervalMs: 1000 }); // 1 second for testing
  });

  afterEach(() => {
    orchestrator.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create orchestrator with default interval', () => {
      const orch = new Orchestrator();
      expect(orch.getStatus().intervalMs).toBe(60_000);
      expect(orch.getStatus().isRunning).toBe(false);
    });

    it('should create orchestrator with custom interval', () => {
      const orch = new Orchestrator(5000);
      expect(orch.getStatus().intervalMs).toBe(5000);
    });
  });

  describe('Start/Stop', () => {
    it('should start the orchestrator', async () => {
      orchestrator.start();
      expect(orchestrator.getStatus().isRunning).toBe(true);

      // Wait for initial cycle to complete
      await vi.runOnlyPendingTimersAsync();
    });

    it('should not start if already running', async () => {
      orchestrator.start();
      const consoleSpy = vi.spyOn(console, 'log');

      orchestrator.start();
      expect(consoleSpy).toHaveBeenCalledWith('[Orchestrator] Already running');

      await vi.runOnlyPendingTimersAsync();
    });

    it('should stop the orchestrator', async () => {
      orchestrator.start();
      await vi.runOnlyPendingTimersAsync();

      orchestrator.stop();
      expect(orchestrator.getStatus().isRunning).toBe(false);
    });

    it('should handle stop when not running', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      orchestrator.stop();
      expect(consoleSpy).toHaveBeenCalledWith('[Orchestrator] Not running');
    });
  });

  describe('Prediction Cycle', () => {
    it('should run prediction cycle successfully', async () => {
      const signal = await orchestrator.runOnce();

      expect(signal).toBeDefined();
      expect(signal.action).toBe(Action.BUY);
      expect(signal.predicted_price).toBe(2050);
      expect(signal.confidence).toBe(0.75);
      expect(signal.reasoning).toBe('Test signal');
    });

    it('should run multiple cycles on interval', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      orchestrator.start();

      // Initial cycle
      await vi.runOnlyPendingTimersAsync();

      // Advance 1 second for next cycle
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();

      // Advance 1 second for another cycle
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();

      // Should have logged multiple cycle starts
      const cycleStarts = consoleSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('Cycle') && call[0].includes('started')
      );
      expect(cycleStarts.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle errors in prediction cycle', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      // Make the mock fail for this test
      vi.mocked(CoinGeckoFetcher).mockImplementationOnce(() => ({
        getMarketSnapshot: vi.fn().mockRejectedValue(new Error('API error')),
        getCurrentPrice: vi.fn(),
      }) as any);

      const failingOrch = new Orchestrator(1000);
      failingOrch.start();

      await vi.runOnlyPendingTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalled();
      failingOrch.stop();
    });
  });

  describe('Manual Execution', () => {
    it('should execute single cycle via runOnce', async () => {
      const signal = await orchestrator.runOnce();

      expect(signal).toBeDefined();
      expect(signal.action).toBeOneOf([Action.BUY, Action.SELL, Action.HOLD]);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.predicted_price).toBeGreaterThan(0);
      expect(signal.reasoning).toBeTruthy();
      expect(signal.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Status', () => {
    it('should return correct status when stopped', () => {
      const status = orchestrator.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.intervalMs).toBe(1000);
    });

    it('should return correct status when running', async () => {
      orchestrator.start();
      await vi.runOnlyPendingTimersAsync();

      const status = orchestrator.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.intervalMs).toBe(1000);
    });
  });
});

// Helper to add toBeOneOf matcher
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});
