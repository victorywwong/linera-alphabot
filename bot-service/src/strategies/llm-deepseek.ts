import { Action, type Signal, type Strategy, type MarketSnapshot } from '../types/index.js';

/**
 * DeepSeek V3 LLM Strategy for Wave 2
 *
 * Uses DeepSeek V3 0324 (Atoma-supported model) via cloud API
 * Migration path: DeepSeek API → Atoma Network (Wave 3)
 */
export class DeepSeekStrategy implements Strategy {
  readonly name = 'deepseek';

  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'; // v3 model

    if (!this.apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is required. Get one from https://platform.deepseek.com'
      );
    }
  }

  async predict(data: MarketSnapshot): Promise<Signal> {
    const systemPrompt = `You are an expert cryptocurrency trader specializing in ETH price predictions.
Analyze market data using technical analysis and market psychology to provide clear trading signals.
IMPORTANT: After your analysis, you MUST provide your final answer in the exact format specified.`;

    const userPrompt = this.buildPrompt(data);

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
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      if (!result.choices || result.choices.length === 0) {
        throw new Error('DeepSeek API returned no choices');
      }

      const content = result.choices[0].message?.content;
      if (!content) {
        throw new Error('DeepSeek API returned empty content');
      }

      return this.parseResponse(content, data);
    } catch (error) {
      console.error('[DeepSeekStrategy] Prediction error:', error);
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
  private buildPrompt(data: MarketSnapshot): string {
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
  private parseResponse(content: string, data: MarketSnapshot): Signal {
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
