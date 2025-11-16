import { config } from 'dotenv';
import { createServer } from './server.js';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3002', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create and start server
const app = createServer();

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  external-service-mirror');
  console.log('  Localhost HTTP proxy for Linera service.rs');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Environment:  ${NODE_ENV}`);
  console.log(`  Port:         ${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    GET  http://localhost:${PORT}/binance/ticker?symbol=ETHUSDT`);
  console.log(`    GET  http://localhost:${PORT}/binance/klines?symbol=ETHUSDT&interval=1h&limit=200`);
  console.log(`    POST http://localhost:${PORT}/inference/chat/completions`);
  console.log('');
  console.log('  Proxies to:');
  console.log(`    Binance:       ${process.env.BINANCE_API_URL || 'https://api.binance.com'}`);
  console.log(`    inference.net: ${process.env.INFERENCE_API_URL || 'https://api.inference.net'}`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');

  // Warn if inference API key is missing
  if (!process.env.INFERENCE_API_KEY) {
    console.warn('⚠️  WARNING: INFERENCE_API_KEY not set');
    console.warn('   LLM inference endpoints will return errors');
    console.warn('   Get your API key from: https://inference.net/dashboard');
    console.warn('');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
