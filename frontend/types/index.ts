/**
 * Type definitions matching the Linera bot-state contract
 */

export enum Action {
  Buy = 'Buy',
  Sell = 'Sell',
  Hold = 'Hold',
}

export interface Signal {
  action: Action;
  predictedPriceMicro: string;
  confidenceBps: number;
  timestamp: number;
  reasoning: string;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  correctPredictions: number;
  directionalAccuracyBps: number;
  rmseMicro: string;
  lastUpdated: number;
}

export interface BotState {
  botId: string;
  latestSignal: Signal | null;
  accuracy24H: AccuracyMetrics;
  followerCount: number;
}

/**
 * GraphQL response types
 */
export interface BotStateResponse {
  botId: string;
  latestSignal: Signal | null;
  accuracy24H: AccuracyMetrics;
  followerCount: number;
}
