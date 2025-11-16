import type { Request, Response } from 'express';
import { z } from 'zod';
import { SimpleMAStrategy } from '../strategies/simple-ma';
import { DeepSeekStrategy } from '../strategies/llm-deepseek';
import { SchematronStrategy } from '../strategies/llm-schematron';
import { QwenVertexStrategy, GPTOSSVertexStrategy } from '../strategies/llm-vertex-ai';
import { MarketSnapshot, SignalSchema } from '../types';
import type { Strategy } from '../types';

/**
 * Request schema for /api/v1/predict endpoint
 */
const PredictRequestSchema = z.object({
  strategy: z.enum(['simple-ma', 'schematron', 'deepseek', 'qwen-vertex', 'gpt-oss-vertex']),
  marketData: z.object({
    timestamp: z.number().int().positive(),
    currentPrice: z.number().positive(),
    priceHistory: z.array(z.object({
      timestamp: z.number().int().positive(),
      open: z.number().positive(),
      high: z.number().positive(),
      low: z.number().positive(),
      close: z.number().positive(),
      volume: z.number().nonnegative(),
      price: z.number().positive(),
    })),
    volume24h: z.number().nonnegative(),
    change24h: z.number(),
    marketCap: z.number().positive().optional(),
  }),
});

/**
 * Strategy factory - creates strategy instance based on name
 */
function createStrategy(strategyName: string): Strategy {
  switch (strategyName.toLowerCase()) {
    case 'schematron':
      return new SchematronStrategy();
    case 'deepseek':
      return new DeepSeekStrategy();
    case 'qwen-vertex':
      return new QwenVertexStrategy();
    case 'gpt-oss-vertex':
      return new GPTOSSVertexStrategy();
    case 'simple-ma':
    default:
      return new SimpleMAStrategy();
  }
}

/**
 * POST /api/v1/predict
 *
 * Executes a prediction using the specified strategy and market data.
 * This endpoint is called by the Linera service layer to run strategies
 * that aren't implemented directly in service.rs (DeepSeek, Vertex AI, etc.)
 *
 * Request body:
 * {
 *   "strategy": "deepseek" | "qwen-vertex" | "gpt-oss-vertex" | "simple-ma",
 *   "marketData": MarketSnapshot
 * }
 *
 * Response:
 * {
 *   "signal": Signal,
 *   "executionTimeMs": number
 * }
 */
export async function predictHandler(req: Request, res: Response): Promise<void> {
  const requestId = Date.now();
  console.log(`[API] [${requestId}] POST /api/v1/predict`);

  try {
    // Validate request body
    const parseResult = PredictRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error(`[API] [${requestId}] Validation error:`, parseResult.error.format());
      res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.format(),
      });
      return;
    }

    const { strategy: strategyName, marketData } = parseResult.data;
    console.log(`[API] [${requestId}] Strategy: ${strategyName}`);
    console.log(`[API] [${requestId}] Market price: $${marketData.currentPrice.toFixed(2)}`);

    // Create and execute strategy
    const startTime = Date.now();
    const strategy = createStrategy(strategyName);
    const signal = await strategy.predict(marketData as MarketSnapshot);
    const executionTimeMs = Date.now() - startTime;

    // Validate signal
    const signalParseResult = SignalSchema.safeParse(signal);
    if (!signalParseResult.success) {
      console.error(`[API] [${requestId}] Invalid signal from strategy:`, signalParseResult.error);
      res.status(500).json({
        error: 'Strategy returned invalid signal',
        details: signalParseResult.error.format(),
      });
      return;
    }

    console.log(
      `[API] [${requestId}] Signal: ${signal.action} @ $${signal.predicted_price.toFixed(2)} ` +
      `(confidence: ${(signal.confidence * 100).toFixed(1)}%) ` +
      `[${executionTimeMs}ms]`
    );

    // Return signal
    res.status(200).json({
      signal,
      executionTimeMs,
    });
  } catch (error) {
    console.error(`[API] [${requestId}] Error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/v1/health
 *
 * Health check endpoint
 */
export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'alphabot-bot-service',
  });
}
