import { z } from 'zod';

/**
 * Trading actions
 */
export enum Action {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
}

/**
 * Signal schema - matches Rust contract
 */
export const SignalSchema = z.object({
  timestamp: z.number().int().positive(),
  action: z.nativeEnum(Action),
  predicted_price: z.number().positive(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(512),
  actual_price: z.number().positive().optional(),
});

export type Signal = z.infer<typeof SignalSchema>;

/**
 * Accuracy metrics schema
 */
export const AccuracyMetricsSchema = z.object({
  rmse: z.number(),
  directional_accuracy: z.number().min(0).max(100),
  total_predictions: z.number().int().nonnegative(),
  correct_predictions: z.number().int().nonnegative(),
  last_updated: z.number().int().positive(),
});

export type AccuracyMetrics = z.infer<typeof AccuracyMetricsSchema>;

/**
 * Market snapshot for strategy input
 */
export interface MarketSnapshot {
  timestamp: number;
  currentPrice: number;
  priceHistory: PricePoint[];
  volume24h: number;
  change24h: number;
  marketCap?: number;
}

/**
 * Historical price point
 */
export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

/**
 * Strategy interface
 */
export interface Strategy {
  readonly name: string;
  predict(data: MarketSnapshot): Promise<Signal>;
}

/**
 * CoinGecko API response types
 */
export const CoinGeckoPriceSchema = z.object({
  ethereum: z.object({
    usd: z.number(),
    usd_market_cap: z.number().optional(),
    usd_24h_vol: z.number().optional(),
    usd_24h_change: z.number().optional(),
  }),
});

export type CoinGeckoPrice = z.infer<typeof CoinGeckoPriceSchema>;

export const CoinGeckoHistorySchema = z.object({
  prices: z.array(z.tuple([z.number(), z.number()])),
  market_caps: z.array(z.tuple([z.number(), z.number()])).optional(),
  total_volumes: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export type CoinGeckoHistory = z.infer<typeof CoinGeckoHistorySchema>;

/**
 * Binance API response types
 */
export const Binance24hrTickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.string(),
  priceChange: z.string(),
  priceChangePercent: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
});

export type Binance24hrTicker = z.infer<typeof Binance24hrTickerSchema>;

// Binance kline: [timestamp, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
export const BinanceKlineSchema = z.tuple([
  z.number(), // Open time
  z.string(), // Open
  z.string(), // High
  z.string(), // Low
  z.string(), // Close
  z.string(), // Volume
  z.number(), // Close time
  z.string(), // Quote asset volume
  z.number(), // Number of trades
  z.string(), // Taker buy base asset volume
  z.string(), // Taker buy quote asset volume
  z.string(), // Ignore
]);

export type BinanceKline = z.infer<typeof BinanceKlineSchema>;

/**
 * Bot state from contract
 */
export interface BotState {
  bot_id: string;
  latest_signal: Signal | null;
  accuracy_24h: AccuracyMetrics;
  follower_count: number;
}

/**
 * Configuration types
 */
export interface MCPConfig {
  coingecko: {
    apiKey?: string;
    baseUrl: string;
  };
  linera: {
    rpcUrl: string;
    graphqlUrl: string;
  };
  redis: {
    url: string;
  };
  database: {
    url: string;
  };
  scheduler: {
    predictionIntervalSeconds: number;
  };
  logging: {
    level: string;
  };
}
