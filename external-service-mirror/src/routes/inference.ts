import express from 'express';
import { InferenceClient } from '../clients/inference.js';
import type { ChatCompletionRequest, ErrorResponse } from '../types/index.js';

const router = express.Router();

// Create client (no API key needed - we forward from request header)
const inferenceClient = new InferenceClient(process.env.INFERENCE_API_URL);

// Fallback API key for direct testing (when service.rs doesn't send header)
const fallbackApiKey = process.env.INFERENCE_API_KEY;
if (!fallbackApiKey) {
  console.warn('WARNING: INFERENCE_API_KEY not set - proxy will only work if service.rs sends Authorization header');
}

/**
 * POST /inference/chat/completions
 * Proxies to: https://api.inference.net/v1/chat/completions
 *
 * Transparently forwards Authorization header from service.rs to inference.net
 * Falls back to INFERENCE_API_KEY env var if no header provided (for testing)
 * Returns ChatCompletionResponse matching OpenAI format
 */
router.post('/chat/completions', async (req, res) => {
  try {
    const request = req.body as ChatCompletionRequest;

    // Get Authorization header from request (sent by service.rs)
    // Or use fallback from env for direct testing
    const authHeader = req.headers.authorization || (fallbackApiKey ? `Bearer ${fallbackApiKey}` : null);

    if (!authHeader) {
      const error: ErrorResponse = {
        error: 'Missing Authorization header',
        details: 'Either pass Authorization header from service.rs or set INFERENCE_API_KEY in .env for testing',
      };
      return res.status(401).json(error);
    }

    // Validate request body
    if (!request.model || !request.messages) {
      const error: ErrorResponse = {
        error: 'Invalid request body',
        details: 'Request must include "model" and "messages" fields',
      };
      return res.status(400).json(error);
    }

    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      const error: ErrorResponse = {
        error: 'Invalid messages array',
        details: 'Messages must be a non-empty array',
      };
      return res.status(400).json(error);
    }

    const response = await inferenceClient.chatCompletions(request, authHeader);
    res.json(response);
  } catch (error) {
    console.error('inference.net proxy error:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to call inference.net API',
      details: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
