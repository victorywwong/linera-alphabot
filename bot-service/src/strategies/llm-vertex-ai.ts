import { Action, type Signal, type Strategy, type MarketSnapshot } from '../types/index.js';
import { GoogleAuth } from 'google-auth-library';
import OpenAI from 'openai';

/**
 * Base class for Vertex AI LLM strategies
 * Supports Qwen 3 Coder 480B and GPT OSS 120B (both Atoma-supported models)
 * Uses OpenAI SDK with Vertex AI's OpenAI-compatible MaaS endpoint
 */
export abstract class VertexAIStrategy implements Strategy {
  abstract readonly name: string;
  protected abstract readonly modelName: string;
  protected abstract readonly endpointDomain: string; // e.g., 'us-south1-aiplatform.googleapis.com' or 'aiplatform.googleapis.com'
  protected abstract readonly location: string; // e.g., 'us-south1' or 'global'

  protected auth: GoogleAuth;
  protected projectId: string;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';

    if (!this.projectId) {
      throw new Error('GCP_PROJECT_ID is required for Vertex AI strategies');
    }

    // Initialize Google Auth for ADC (Application Default Credentials)
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  async predict(data: MarketSnapshot): Promise<Signal> {
    const systemPrompt = `You are an expert cryptocurrency trader specializing in ETH price predictions.
Analyze market data using technical analysis and provide clear trading signals.
IMPORTANT: After your analysis, you MUST provide your final answer in the exact format specified.`;

    const userPrompt = this.buildPrompt(data);

    console.log(`[${this.name}] Using model: ${this.modelName} in project ${this.projectId}`);
    console.log(`[${this.name}] Endpoint: ${this.endpointDomain}, Location: ${this.location}`);
    console.log(`[${this.name}] Data series length: ${data.priceHistory.length} bars`);
    console.log(`[${this.name}] First 5 bars:`, data.priceHistory.slice(0, 5).map(p => ({
      timestamp: new Date(p.timestamp).toISOString(),
      close: p.close,
    })));
    console.log(`[${this.name}] Last 5 bars:`, data.priceHistory.slice(-5).map(p => ({
      timestamp: new Date(p.timestamp).toISOString(),
      close: p.close,
    })));
    console.log(`[${this.name}] Full prompt length: ${userPrompt.length} characters`);
    console.log(`[${this.name}] Full user prompt:\n${userPrompt}`);

    try {
      // Get access token from Google Auth (ADC)
      console.log(`[${this.name}] Getting access token...`);
      const authClient = await this.auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error('Failed to get GCP access token');
      }

      const tokenPreview = `${accessToken.token.substring(0, 20)}...${accessToken.token.substring(accessToken.token.length - 20)}`;
      console.log(`[${this.name}] Access token obtained: ${tokenPreview}`);

      // Create OpenAI client with Vertex AI endpoint
      // Pattern: Regional uses prefix + regional location, Global uses no prefix + global location
      const baseURL = `https://${this.endpointDomain}/v1/projects/${this.projectId}/locations/${this.location}/endpoints/openapi`;
      console.log(`[${this.name}] Base URL: ${baseURL}`);

      const openai = new OpenAI({
        apiKey: accessToken.token,
        baseURL,
      });

      console.log(`[${this.name}] Calling chat.completions.create with model: ${this.modelName}`);

      // Call OpenAI-compatible endpoint (non-streaming for simplicity)
      const completion = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024, // Increased for reasoning models that need more tokens
        stream: false, // Non-streaming for now
      });

      console.log(`[${this.name}] Success! Completion:`, JSON.stringify(completion, null, 2));

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('Vertex AI returned no choices');
      }

      const message = completion.choices[0].message;
      // GPT OSS uses reasoning_content instead of content
      const content = message?.content || (message as any)?.reasoning_content;
      if (!content) {
        throw new Error('Vertex AI returned empty content');
      }

      return this.parseResponse(content, data);
    } catch (error) {
      console.error(`[${this.name}] Prediction error:`, error);

      // Fallback to HOLD with current price on error
      return {
        timestamp: data.timestamp,
        action: Action.HOLD,
        predicted_price: data.currentPrice,
        confidence: 0.1,
        reasoning: `Error during prediction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Build the prompt with market data
   */
  protected buildPrompt(data: MarketSnapshot): string {
    // Format ALL OHLC candlestick data (entire history)
    const allOHLC = data.priceHistory
      .map((candle, i) => {
        const hoursAgo = data.priceHistory.length - i;
        const date = new Date(candle.timestamp);
        return `${hoursAgo}h ago (${date.toISOString().substring(11, 16)}): O=$${candle.open.toFixed(2)} H=$${candle.high.toFixed(2)} L=$${candle.low.toFixed(2)} C=$${candle.close.toFixed(2)} V=${(candle.volume / 1000).toFixed(1)}k`;
      })
      .join('\n');

    // Calculate some basic stats from full history
    const allPrices = data.priceHistory.map(p => p.close);
    const maxPrice = Math.max(...allPrices);
    const minPrice = Math.min(...allPrices);
    const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

    return `
Current ETH Market Data (${data.priceHistory.length} hourly candles):
- Current Price: $${data.currentPrice.toFixed(2)}
- 24h Change: ${data.change24h.toFixed(2)}%
- 24h Volume: $${data.volume24h.toLocaleString()}

Statistics over ${data.priceHistory.length}h period:
- High: $${maxPrice.toFixed(2)}
- Low: $${minPrice.toFixed(2)}
- Average: $${avgPrice.toFixed(2)}

Complete OHLC Candlesticks (all ${data.priceHistory.length} hourly bars):
${allOHLC}

Task: Predict ETH price movement in the next hour based on technical analysis of the complete dataset above.

You may perform your analysis and reasoning first, then provide your final prediction.

At the END of your response, provide your final answer in this EXACT format:
ACTION: [BUY, SELL, or HOLD]
PRICE: [predicted price in USD, e.g., 3575.50]
CONFIDENCE: [0-100, e.g., 75]
REASONING: [max 200 chars explaining your technical analysis]

Example final answer:
ACTION: BUY
PRICE: 3575.50
CONFIDENCE: 78
REASONING: Bullish divergence on RSI, golden cross forming, strong support at $3550 with increasing volume. Targeting $3600 resistance.
`;
  }

  /**
   * Parse LLM response into structured Signal
   */
  protected parseResponse(content: string, data: MarketSnapshot): Signal {
    const lines = content.split('\n').filter((l) => l.trim());

    let action: Action = Action.HOLD;
    let predictedPrice = data.currentPrice;
    let confidence = 0.5;
    let reasoning = 'No reasoning provided';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('ACTION:')) {
        const actionStr = trimmedLine.split(':')[1].trim().toUpperCase();
        if (actionStr.includes('BUY')) {
          action = Action.BUY;
        } else if (actionStr.includes('SELL')) {
          action = Action.SELL;
        } else {
          action = Action.HOLD;
        }
      } else if (trimmedLine.startsWith('PRICE:')) {
        const priceStr = trimmedLine.split(':')[1].trim().replace(/[$,]/g, '');
        const parsed = parseFloat(priceStr);
        if (!isNaN(parsed) && parsed > 0) {
          predictedPrice = parsed;
        }
      } else if (trimmedLine.startsWith('CONFIDENCE:')) {
        const confStr = trimmedLine.split(':')[1].trim().replace('%', '');
        const parsed = parseFloat(confStr);
        if (!isNaN(parsed)) {
          // Convert 0-100 to 0-1, clamp to valid range
          confidence = Math.min(Math.max(parsed / 100, 0), 1);
        }
      } else if (trimmedLine.startsWith('REASONING:')) {
        reasoning = trimmedLine
          .split(':')
          .slice(1)
          .join(':')
          .trim()
          .substring(0, 512);
      }
    }

    return {
      timestamp: data.timestamp,
      action,
      predicted_price: predictedPrice,
      confidence,
      reasoning,
    };
  }
}

/**
 * Qwen 3 Coder 480B via GCP Vertex AI Strategy
 *
 * Uses Google Cloud Platform's Vertex AI endpoint for Qwen 3 Coder 480B
 * This is the EXACT model supported by Atoma Network (480B variant)
 *
 * Endpoint pattern: https://us-south1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-south1/endpoints/openapi
 * Note: Regional endpoint (us-south1) + regional location path (us-south1)
 * Migration path: GCP Qwen 480B → Atoma Qwen 480B (Wave 3)
 */
export class QwenVertexStrategy extends VertexAIStrategy {
  readonly name = 'qwen-vertex';
  protected readonly modelName = process.env.GCP_QWEN_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct-maas';
  protected readonly endpointDomain = 'us-south1-aiplatform.googleapis.com';
  protected readonly location = 'us-south1';
}

/**
 * GPT OSS 120B via GCP Vertex AI Strategy
 *
 * Uses Google Cloud Platform's Vertex AI endpoint for GPT OSS 120B
 * This is an Atoma-supported model
 *
 * Endpoint pattern: https://aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/global/endpoints/openapi
 * Note: Global endpoint (no regional prefix) + global location path
 * Migration path: GCP GPT OSS → Atoma GPT OSS (Wave 3)
 */
export class GPTOSSVertexStrategy extends VertexAIStrategy {
  readonly name = 'gpt-oss-vertex';
  protected readonly modelName = process.env.GCP_GPT_OSS_MODEL || 'openai/gpt-oss-120b-maas';
  protected readonly endpointDomain = 'aiplatform.googleapis.com';
  protected readonly location = 'global';
}
