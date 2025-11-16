import express, { type Express } from 'express';
import { predictHandler, healthHandler } from './predict';

/**
 * API Server configuration
 */
export interface ApiServerConfig {
  port?: number;
  host?: string;
}

/**
 * Create and configure Express server for bot-service API
 *
 * This server exposes endpoints that can be called by the Linera service layer
 * to execute strategies (DeepSeek, Vertex AI, etc.) from on-chain logic.
 */
export function createApiServer(_config: ApiServerConfig = {}): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' })); // Allow large market data payloads
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);
  app.post('/api/v1/predict', predictHandler);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}

/**
 * Start the API server
 */
export function startApiServer(config: ApiServerConfig = {}): Promise<{ port: number; host: string }> {
  const port = config.port || parseInt(process.env.API_PORT || '3001', 10);
  const host = config.host || process.env.API_HOST || '0.0.0.0';

  const app = createApiServer(config);

  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        console.log(`[API] Server listening on http://${host}:${port}`);
        console.log(`[API] Health check: http://${host}:${port}/health`);
        console.log(`[API] Predict endpoint: POST http://${host}:${port}/api/v1/predict`);
        resolve({ port, host });
      });

      server.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
