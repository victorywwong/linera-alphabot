import { Action, type Signal } from '../types';

/**
 * Convert USD price to micro-USD for contract storage
 * @param usd - Price in USD (e.g., 3500.25)
 * @returns String representation of price in micro-USD (e.g., "3500250000")
 */
export function toMicroUSD(usd: number): string {
  return Math.floor(usd * 1_000_000).toString();
}

/**
 * Convert micro-USD to USD for display
 * @param microUsd - Price in micro-USD (e.g., 3500250000)
 * @returns Price in USD (e.g., 3500.25)
 */
export function fromMicroUSD(microUsd: number): number {
  return microUsd / 1_000_000;
}

/**
 * Convert decimal (0.0-1.0) to basis points for contract storage
 * @param decimal - Decimal value (e.g., 0.85 for 85%)
 * @returns Basis points (e.g., 8500)
 */
export function toBasisPoints(decimal: number): number {
  return Math.floor(decimal * 10_000);
}

/**
 * Convert basis points to decimal (0.0-1.0)
 * @param bps - Basis points (e.g., 8500 for 85%)
 * @returns Decimal value (e.g., 0.85)
 */
export function fromBasisPoints(bps: number): number {
  return bps / 10_000;
}

/**
 * Configuration for Linera client
 */
export interface LineraConfig {
  /** GraphQL endpoint URL for the Linera node */
  endpoint: string;
  /** Application ID for the bot-state contract */
  applicationId: string;
  /** Chain ID where the application is deployed */
  chainId: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Response from Linera mutation operations
 */
export interface OperationResponse {
  success: boolean;
  certificateHash?: string;
  error?: string;
}

/**
 * Client for interacting with Linera blockchain
 * Submits predictions to the bot-state smart contract
 */
export class LineraClient {
  private config: LineraConfig;
  private readonly timeout: number;

  constructor(config: LineraConfig) {
    this.config = config;
    this.timeout = config.timeout || 30_000; // 30 second default
  }

  /**
   * Submit a new prediction signal to the contract
   */
  async submitPrediction(signal: Signal): Promise<OperationResponse> {
    const mutation = `
      mutation SubmitPrediction(
        $timestamp: String!
        $action: Action!
        $predictedPriceMicro: String!
        $confidenceBps: Int!
        $reasoning: String!
      ) {
        submitPrediction(
          timestamp: $timestamp
          action: $action
          predictedPriceMicro: $predictedPriceMicro
          confidenceBps: $confidenceBps
          reasoning: $reasoning
        )
      }
    `;

    const variables = {
      timestamp: signal.timestamp.toString(),
      action: this.actionToGraphQL(signal.action),
      predictedPriceMicro: toMicroUSD(signal.predicted_price),
      confidenceBps: toBasisPoints(signal.confidence),
      reasoning: signal.reasoning,
    };

    try {
      const response = await this.executeMutation(mutation, variables);
      return {
        success: true,
        certificateHash: response.certificateHash,
      };
    } catch (error) {
      console.error('[LineraClient] Failed to submit prediction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Resolve a previous prediction with actual price
   */
  async resolveSignal(
    timestamp: number,
    actualPrice: number
  ): Promise<OperationResponse> {
    const mutation = `
      mutation ResolveSignal(
        $timestamp: String!
        $actualPriceMicro: String!
      ) {
        resolveSignal(
          timestamp: $timestamp
          actualPriceMicro: $actualPriceMicro
        )
      }
    `;

    const variables = {
      timestamp: timestamp.toString(),
      actualPriceMicro: toMicroUSD(actualPrice),
    };

    try {
      const response = await this.executeMutation(mutation, variables);
      return {
        success: true,
        certificateHash: response.certificateHash,
      };
    } catch (error) {
      console.error('[LineraClient] Failed to resolve signal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query the bot state from the contract
   */
  async getBotState(): Promise<{
    botId: string;
    latestSignal: Signal | null;
    accuracy24h: {
      rmse: number;
      directionalAccuracy: number;
      totalPredictions: number;
      correctPredictions: number;
      lastUpdated: number;
    };
    followerCount: number;
  } | null> {
    const query = `
      query GetBotState {
        botId
        latestSignal {
          timestamp
          action
          predictedPriceMicro
          confidenceBps
          reasoning
          actualPriceMicro
        }
        accuracy24H {
          rmseMicro
          directionalAccuracyBps
          totalPredictions
          correctPredictions
          lastUpdated
        }
        followerCount
      }
    `;

    try {
      const response = await this.executeQuery(query, {});
      const data = response.data;

      // Convert contract data (micro-USD, basis points) to TypeScript types (USD, decimals)
      return {
        botId: data.botId,
        latestSignal: data.latestSignal ? {
          timestamp: data.latestSignal.timestamp,
          action: data.latestSignal.action,
          predicted_price: fromMicroUSD(parseInt(data.latestSignal.predictedPriceMicro)),
          confidence: fromBasisPoints(data.latestSignal.confidenceBps),
          reasoning: data.latestSignal.reasoning,
          actual_price: data.latestSignal.actualPriceMicro
            ? fromMicroUSD(parseInt(data.latestSignal.actualPriceMicro))
            : undefined,
        } : null,
        accuracy24h: {
          rmse: fromMicroUSD(data.accuracy24H.rmseMicro),
          directionalAccuracy: fromBasisPoints(data.accuracy24H.directionalAccuracyBps),
          totalPredictions: data.accuracy24H.totalPredictions,
          correctPredictions: data.accuracy24H.correctPredictions,
          lastUpdated: data.accuracy24H.lastUpdated,
        },
        followerCount: data.followerCount,
      };
    } catch (error) {
      console.error('[LineraClient] Failed to query bot state:', error);
      return null;
    }
  }

  /**
   * Execute a GraphQL mutation
   */
  private async executeMutation(
    mutation: string,
    variables: Record<string, unknown>
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as any;

      if (result.errors) {
        throw new Error(
          `GraphQL errors: ${JSON.stringify(result.errors)}`
        );
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Execute a GraphQL query
   */
  private async executeQuery(
    query: string,
    variables: Record<string, unknown>
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as any;

      if (result.errors) {
        throw new Error(
          `GraphQL errors: ${JSON.stringify(result.errors)}`
        );
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Convert Action enum to GraphQL enum value
   */
  private actionToGraphQL(action: Action): string {
    switch (action) {
      case Action.BUY:
        return 'BUY';
      case Action.SELL:
        return 'SELL';
      case Action.HOLD:
        return 'HOLD';
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LineraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LineraConfig {
    return { ...this.config };
  }
}
