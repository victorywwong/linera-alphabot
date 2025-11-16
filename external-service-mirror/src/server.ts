import express from 'express';
import binanceRoutes from './routes/binance.js';
import inferenceRoutes from './routes/inference.js';

/**
 * Create and configure Express app
 */
export function createServer() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Request logging
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'external-service-mirror',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount route handlers
  app.use('/binance', binanceRoutes);
  app.use('/inference', inferenceRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      details: 'Available endpoints: /health, /binance/ticker, /binance/klines, /inference/chat/completions',
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      details: err.message,
    });
  });

  return app;
}
