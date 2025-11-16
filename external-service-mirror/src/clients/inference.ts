import fetch from 'node-fetch';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../types/index.js';

/**
 * inference.net API HTTP client
 * Handles LLM inference requests via OpenAI-compatible API
 * Transparently forwards Authorization header from incoming requests
 */
export class InferenceClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://api.inference.net') {
    this.baseUrl = baseUrl;
  }

  /**
   * Call chat completions endpoint
   * Endpoint: POST /v1/chat/completions
   * @param request - Chat completion request
   * @param authHeader - Authorization header (e.g., "Bearer sk-...")
   */
  async chatCompletions(
    request: ChatCompletionRequest,
    authHeader: string
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data as ChatCompletionResponse;
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
    },
    retries = 3
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `inference.net API error: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        return response as unknown as Response;
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff: 2s, 4s, 8s (LLM calls can be slower)
        await this.delay(Math.pow(2, i + 1) * 1000);
      }
    }

    throw new Error('Fetch retry exhausted');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
