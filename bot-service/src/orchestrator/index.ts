import { BinanceFetcher } from '../fetchers/binance';
import { SimpleMAStrategy } from '../strategies/simple-ma';
import { DeepSeekStrategy } from '../strategies/llm-deepseek';
import { SchematronStrategy } from '../strategies/llm-schematron';
import { QwenVertexStrategy, GPTOSSVertexStrategy } from '../strategies/llm-vertex-ai';
import { LineraClient, type LineraConfig } from '../clients/linera';
import type { Signal, Strategy } from '../types';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Prediction interval in milliseconds */
  intervalMs?: number;
  /** Optional Linera client configuration */
  lineraConfig?: LineraConfig;
}

/**
 * Main orchestrator that coordinates the prediction pipeline
 * Runs on a configurable interval (default 60 seconds)
 */
export class Orchestrator {
  private fetcher: BinanceFetcher;
  private strategy: Strategy;
  private lineraClient: LineraClient | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly intervalMs: number;

  constructor(config: OrchestratorConfig = {}) {
    const baseUrl = process.env.BINANCE_BASE_URL || 'https://api.binance.com';

    this.fetcher = new BinanceFetcher(baseUrl);
    this.strategy = this.createStrategy();
    this.intervalMs = config.intervalMs || 60_000;

    if (config.lineraConfig) {
      this.lineraClient = new LineraClient(config.lineraConfig);
    }
  }

  /**
   * Create strategy based on STRATEGY environment variable
   */
  private createStrategy(): Strategy {
    const strategyType = process.env.STRATEGY || 'simple-ma';

    switch (strategyType.toLowerCase()) {
      case 'schematron':
        console.log('[Orchestrator] Using Schematron 3B strategy (Atoma inference network)');
        return new SchematronStrategy();

      case 'deepseek':
        console.log('[Orchestrator] Using DeepSeek V3 strategy (Deepseek endpoint-supported)');
        return new DeepSeekStrategy();

      case 'qwen-vertex':
        console.log('[Orchestrator] Using Qwen 3 Coder 480B via Vertex AI SDK (Atoma-supported)');
        return new QwenVertexStrategy();

      case 'gpt-oss-vertex':
        console.log('[Orchestrator] Using GPT OSS 120B via Vertex AI SDK (Atoma-supported)');
        return new GPTOSSVertexStrategy();

      case 'simple-ma':
      default:
        console.log('[Orchestrator] Using SimpleMA strategy (baseline)');
        return new SimpleMAStrategy();
    }
  }

  /**
   * Start the orchestrator loop
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Orchestrator] Already running');
      return;
    }

    console.log(`[Orchestrator] Starting with ${this.intervalMs}ms interval`);
    this.isRunning = true;

    // Run immediately on start
    this.runPredictionCycle().catch((err) => {
      console.error('[Orchestrator] Error in initial cycle:', err);
    });

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runPredictionCycle().catch((err) => {
        console.error('[Orchestrator] Error in prediction cycle:', err);
      });
    }, this.intervalMs);
  }

  /**
   * Stop the orchestrator loop
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[Orchestrator] Not running');
      return;
    }

    console.log('[Orchestrator] Stopping');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Main prediction cycle: fetch → predict → log
   */
  private async runPredictionCycle(): Promise<Signal> {
    const cycleId = Date.now();
    console.log(`\n[Orchestrator] Cycle ${cycleId} started`);

    try {
      // Step 1: Fetch market data
      console.log('[Orchestrator] Fetching market snapshot...');
      const snapshot = await this.fetcher.getMarketSnapshot();
      console.log(
        `[Orchestrator] Current price: $${snapshot.currentPrice.toFixed(2)}`
      );

      // Step 2: Generate prediction
      console.log('[Orchestrator] Generating prediction...');
      const signal = await this.strategy.predict(snapshot);
      console.log(
        `[Orchestrator] Signal: ${signal.action} @ $${signal.predicted_price.toFixed(2)} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`
      );
      console.log(`[Orchestrator] Reasoning: ${signal.reasoning}`);

      // Step 3: Submit to Linera
      if (this.lineraClient) {
        console.log('[Orchestrator] Submitting to Linera contract...');
        const result = await this.lineraClient.submitPrediction(signal);
        if (result.success) {
          console.log(`[Orchestrator] ✓ Submitted to Linera (hash: ${result.certificateHash})`);
        } else {
          console.log(`[Orchestrator] ✗ Failed to submit to Linera: ${result.error}`);
        }
      } else {
        console.log('[Orchestrator] [SKIP] No Linera client configured');
      }

      // Step 4: Log to database (placeholder for now)
      // TODO: Implement PostgreSQL logging
      console.log('[Orchestrator] [TODO] Log to PostgreSQL');

      console.log(`[Orchestrator] Cycle ${cycleId} completed successfully`);
      return signal;
    } catch (error) {
      console.error(`[Orchestrator] Cycle ${cycleId} failed:`, error);
      throw error;
    }
  }

  /**
   * Run a single prediction cycle manually (useful for testing)
   */
  async runOnce(): Promise<Signal> {
    return this.runPredictionCycle();
  }

  /**
   * Get orchestrator status
   */
  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }
}
