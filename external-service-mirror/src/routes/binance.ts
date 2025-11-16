import express from 'express';
import { BinanceClient } from '../clients/binance.js';
import type { ErrorResponse } from '../types/index.js';

const router = express.Router();
const binanceClient = new BinanceClient(process.env.BINANCE_API_URL);

/**
 * GET /binance/ticker?symbol=ETHUSDT
 * Proxies to: https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT
 *
 * Returns Binance24hrTicker format matching service.rs expectations
 */
router.get('/ticker', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol) {
      const error: ErrorResponse = {
        error: 'Missing required parameter: symbol',
        details: 'Query parameter "symbol" is required (e.g., ?symbol=ETHUSDT)',
      };
      return res.status(400).json(error);
    }

    const ticker = await binanceClient.get24hrTicker(symbol);
    res.json(ticker);
  } catch (error) {
    console.error('Binance ticker proxy error:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to fetch Binance ticker data',
      details: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /binance/klines?symbol=ETHUSDT&interval=1h&limit=200
 * Proxies to: https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=200
 *
 * Returns BinanceKline[] array matching service.rs expectations
 */
router.get('/klines', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const interval = req.query.interval as string;
    const limitStr = req.query.limit as string;

    if (!symbol || !interval || !limitStr) {
      const error: ErrorResponse = {
        error: 'Missing required parameters',
        details: 'Query parameters "symbol", "interval", and "limit" are required',
      };
      return res.status(400).json(error);
    }

    const limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      const error: ErrorResponse = {
        error: 'Invalid limit parameter',
        details: 'Limit must be a number between 1 and 1000',
      };
      return res.status(400).json(error);
    }

    const klines = await binanceClient.getKlines(symbol, interval, limit);
    res.json(klines);
  } catch (error) {
    console.error('Binance klines proxy error:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to fetch Binance klines data',
      details: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
