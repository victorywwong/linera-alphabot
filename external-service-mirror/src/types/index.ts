/**
 * Type definitions for external-service-mirror
 * These match the exact response formats expected by service.rs
 */

/**
 * Binance 24hr Ticker Response
 * Matches Binance24hrTicker struct in service.rs
 */
export interface Binance24hrTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

/**
 * Binance Kline (OHLC Candlestick) Response
 * Format: [timestamp, open, high, low, close, volume, close_time, quote_volume, trades, taker_buy_base, taker_buy_quote, ignore]
 * Matches BinanceKline tuple in service.rs
 */
export type BinanceKline = [
  number,  // Open time
  string,  // Open
  string,  // High
  string,  // Low
  string,  // Close
  string,  // Volume
  number,  // Close time
  string,  // Quote asset volume
  number,  // Number of trades
  string,  // Taker buy base asset volume
  string,  // Taker buy quote asset volume
  string   // Ignore
];

/**
 * inference.net Chat Completion Request
 * OpenAI-compatible format
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * inference.net Chat Completion Response
 * OpenAI-compatible format
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}
