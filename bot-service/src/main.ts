#!/usr/bin/env node
import 'dotenv/config';
import { Orchestrator } from './orchestrator/index';

/**
 * CLI entry point for AlphaBot MCP
 * Runs the orchestrator loop to generate trading predictions
 */

const DEFAULT_INTERVAL_MS = 60_000; // 60 seconds

async function main() {
  console.log('🤖 AlphaBot MCP Starting...\n');

  // Parse interval from command line args
  const intervalArg = process.argv.find((arg) => arg.startsWith('--interval='));
  const intervalMs = intervalArg
    ? parseInt(intervalArg.split('=')[1], 10) * 1000
    : DEFAULT_INTERVAL_MS;

  console.log(`Prediction interval: ${intervalMs / 1000}s\n`);

  const orchestrator = new Orchestrator({ intervalMs });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    orchestrator.stop();
    process.exit(0);
  });

  // Start the orchestrator
  orchestrator.start();

  console.log('✅ Orchestrator running. Press Ctrl+C to stop.\n');
  console.log('━'.repeat(60));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
