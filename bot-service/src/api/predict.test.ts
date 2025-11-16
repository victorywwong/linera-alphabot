import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { predictHandler, healthHandler } from './predict';
import { Action } from '../types';

// Mock strategies
vi.mock('../strategies/simple-ma', () => ({
  SimpleMAStrategy: vi.fn().mockImplementation(() => ({
    name: 'simple-ma',
    predict: vi.fn().mockResolvedValue({
      timestamp: Date.now(),
      action: Action.BUY,
      predicted_price: 3500,
      confidence: 0.75,
      reasoning: 'SMA20 > SMA50 crossover',
    }),
  })),
}));

vi.mock('../strategies/llm-deepseek', () => ({
  DeepSeekStrategy: vi.fn().mockImplementation(() => ({
    name: 'deepseek',
    predict: vi.fn().mockResolvedValue({
      timestamp: Date.now(),
      action: Action.HOLD,
      predicted_price: 3480,
      confidence: 0.65,
      reasoning: 'Sideways consolidation expected',
    }),
  })),
}));

vi.mock('../strategies/llm-vertex-ai', () => ({
  QwenVertexStrategy: vi.fn().mockImplementation(() => ({
    name: 'qwen-vertex',
    predict: vi.fn().mockResolvedValue({
      timestamp: Date.now(),
      action: Action.SELL,
      predicted_price: 3450,
      confidence: 0.80,
      reasoning: 'Bearish divergence detected',
    }),
  })),
  GPTOSSVertexStrategy: vi.fn().mockImplementation(() => ({
    name: 'gpt-oss-vertex',
    predict: vi.fn().mockResolvedValue({
      timestamp: Date.now(),
      action: Action.BUY,
      predicted_price: 3550,
      confidence: 0.70,
      reasoning: 'Bullish momentum building',
    }),
  })),
}));

describe('API /api/v1/predict', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    mockReq = {
      body: {},
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };
  });

  it('should reject requests without strategy', async () => {
    mockReq.body = {
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3500,
        priceHistory: [],
        volume24h: 1000000,
        change24h: 2.5,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid request',
      })
    );
  });

  it('should reject requests without marketData', async () => {
    mockReq.body = {
      strategy: 'simple-ma',
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
  });

  it('should execute simple-ma strategy successfully', async () => {
    mockReq.body = {
      strategy: 'simple-ma',
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3500,
        priceHistory: [
          { timestamp: Date.now(), open: 3490, high: 3510, low: 3480, close: 3500, volume: 1000, price: 3500 },
        ],
        volume24h: 1000000,
        change24h: 2.5,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.objectContaining({
          action: Action.BUY,
          predicted_price: 3500,
          confidence: 0.75,
        }),
        executionTimeMs: expect.any(Number),
      })
    );
  });

  it('should execute deepseek strategy successfully', async () => {
    mockReq.body = {
      strategy: 'deepseek',
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3480,
        priceHistory: [
          { timestamp: Date.now(), open: 3470, high: 3490, low: 3465, close: 3480, volume: 1000, price: 3480 },
        ],
        volume24h: 1000000,
        change24h: 1.2,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.objectContaining({
          action: Action.HOLD,
          predicted_price: 3480,
        }),
      })
    );
  });

  it('should execute qwen-vertex strategy successfully', async () => {
    mockReq.body = {
      strategy: 'qwen-vertex',
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3460,
        priceHistory: [
          { timestamp: Date.now(), open: 3470, high: 3475, low: 3455, close: 3460, volume: 1000, price: 3460 },
        ],
        volume24h: 1000000,
        change24h: -1.5,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.objectContaining({
          action: Action.SELL,
          predicted_price: 3450,
        }),
      })
    );
  });

  it('should execute gpt-oss-vertex strategy successfully', async () => {
    mockReq.body = {
      strategy: 'gpt-oss-vertex',
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3520,
        priceHistory: [
          { timestamp: Date.now(), open: 3500, high: 3530, low: 3495, close: 3520, volume: 1000, price: 3520 },
        ],
        volume24h: 1000000,
        change24h: 3.0,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: expect.objectContaining({
          action: Action.BUY,
          predicted_price: 3550,
        }),
      })
    );
  });

  it('should reject invalid strategy names', async () => {
    mockReq.body = {
      strategy: 'invalid-strategy',
      marketData: {
        timestamp: Date.now(),
        currentPrice: 3500,
        priceHistory: [],
        volume24h: 1000000,
        change24h: 2.5,
      },
    };

    await predictHandler(mockReq as Request, mockRes as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
  });
});

describe('API /health', () => {
  it('should return 200 with status ok', () => {
    const mockReq = {} as Request;
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const mockRes = {
      status: statusSpy,
      json: jsonSpy,
    } as unknown as Response;

    healthHandler(mockReq, mockRes);

    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'alphabot-bot-service',
      })
    );
  });
});
