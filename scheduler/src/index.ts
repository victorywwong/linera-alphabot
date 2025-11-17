import cron from 'node-cron';
import { GraphQLClient, gql } from 'graphql-request';

// Configuration from environment variables
const LINERA_GRAPHQL_URL = process.env.LINERA_GRAPHQL_URL;
const STRATEGY = process.env.STRATEGY || 'gemma';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *'; // Every hour
const INFERENCE_API_KEY = process.env.INFERENCE_API_KEY;

if (!LINERA_GRAPHQL_URL) {
  console.error('ERROR: LINERA_GRAPHQL_URL environment variable is required');
  process.exit(1);
}

// GraphQL mutation to trigger prediction
const EXECUTE_PREDICTION_MUTATION = gql`
  mutation ExecutePrediction($strategy: String!, $apiKey: String) {
    executePrediction(strategy: $strategy, apiKey: $apiKey) {
      timestamp
      action
      predictedPriceMicro
      confidenceBps
      reasoning
    }
  }
`;

// Create GraphQL client
const graphQLClient = new GraphQLClient(LINERA_GRAPHQL_URL);

/**
 * Trigger a prediction by calling the contract's executePrediction mutation
 */
async function triggerPrediction() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Triggering prediction...`);
  console.log(`  Strategy: ${STRATEGY}`);
  console.log(`  Endpoint: ${LINERA_GRAPHQL_URL}`);

  try {
    const result = await graphQLClient.request(EXECUTE_PREDICTION_MUTATION, {
      strategy: STRATEGY,
      apiKey: INFERENCE_API_KEY,
    });

    console.log(`[${timestamp}] ✅ Prediction triggered successfully`);
    console.log(`  Result: ${JSON.stringify(result)}`);
  } catch (error) {
    // TODO: Fix error handling - Linera mutations return 200 with transaction hash in error.response.error
    // This is actually a success (transaction submitted) but graphql-request treats it as error
    // Should parse error.response.error for {"data":"<tx_hash>"} and treat as success
    // For now, predictions ARE working despite the error message
    console.error(`[${timestamp}] ❌ Failed to trigger prediction:`);
    console.error(error);
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  AlphaBot Scheduler - Just-in-Time Oracle');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Strategy:    ${STRATEGY}`);
  console.log(`  Schedule:    ${CRON_SCHEDULE}`);
  console.log(`  GraphQL URL: ${LINERA_GRAPHQL_URL}`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');

  // Run once immediately on startup
  console.log('Running initial prediction on startup...');
  await triggerPrediction();

  // Schedule cron job
  cron.schedule(CRON_SCHEDULE, async () => {
    await triggerPrediction();
  });

  console.log(`\n⏰ Cron job scheduled: ${CRON_SCHEDULE}`);
  console.log('   Waiting for next trigger...\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the scheduler
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
