#!/usr/bin/env node
import 'dotenv/config';
import { Orchestrator } from './orchestrator/index';
import { startApiServer } from './api/server';

/**
 * Main entry point for AlphaBot Bot Service
 *
 * Starts two services:
 * 1. Orchestrator: Runs prediction cycles on an interval (cron-like)
 * 2. API Server: Exposes REST endpoints for Linera service layer to call
 */

const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds

async function main() {
  console.log('🤖 AlphaBot Bot Service Starting...\n');

  // Parse command line args
  const intervalArg = process.argv.find((arg) => arg.startsWith('--interval='));
  const intervalMs = intervalArg
    ? parseInt(intervalArg.split('=')[1], 10) * 1000
    : DEFAULT_INTERVAL_MS;

  const apiOnlyMode = process.argv.includes('--api-only');
  const orchestratorOnlyMode = process.argv.includes('--orchestrator-only');

  console.log(`Mode: ${apiOnlyMode ? 'API Only' : orchestratorOnlyMode ? 'Orchestrator Only' : 'Full (API + Orchestrator)'}`);
  console.log(`Prediction interval: ${intervalMs / 1000}s\n`);

  let orchestrator: Orchestrator | null = null;

  // Start API server (unless in orchestrator-only mode)
  if (!orchestratorOnlyMode) {
    try {
      const { port, host } = await startApiServer();
      console.log(`✅ API Server running on http://${host}:${port}\n`);
    } catch (error) {
      console.error('❌ Failed to start API server:', error);
      process.exit(1);
    }
  }

  // Start orchestrator (unless in api-only mode)
  if (!apiOnlyMode) {
    orchestrator = new Orchestrator({ intervalMs });
    orchestrator.start();
    console.log('✅ Orchestrator running\n');
  }

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    if (orchestrator) {
      orchestrator.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('━'.repeat(60));
  console.log('Press Ctrl+C to stop.');
  console.log('━'.repeat(60));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
