# Bot Service

Node.js service responsible for market data ingestion, strategy execution, and Linera transaction submission.

This service orchestrates the AlphaBot prediction workflow:
- Fetches market data from CoinGecko API
- Executes trading strategies (SimpleMA, LLM-based in Wave 2)
- Submits predictions to Linera smart contracts
- Runs on a configurable schedule (default: 60s intervals)

## Architecture

```
CoinGecko API → Market Fetcher → Strategy Engine → Linera Client → Blockchain
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run orchestrator (automated bot)
pnpm dev

# Run integration test
npx tsx test-linera-simple.ts
```

## Components

- **Fetchers** (`src/fetchers/`) - API clients for market data
- **Strategies** (`src/strategies/`) - Prediction logic (SimpleMA, etc.)
- **Clients** (`src/clients/`) - LineraClient for blockchain interaction
- **Orchestrator** (`src/orchestrator/`) - Cron scheduler for prediction loop

## Testing

See `TESTING_GUIDE.md` for detailed testing instructions.

## Docker Deployment

Run multiple bot strategies in parallel using Docker Compose:

```bash
# From project root
make bots-build    # Build images
make bots-up       # Start all bots (qwen, gpt-oss, simple-ma, deepseek)
make bots-logs     # View logs
make bots-down     # Stop all bots
```

See `../PROGRESS_SUMMARIES/DOCKER.md` for detailed deployment guide.

## Note on Naming

This directory was previously named `mcp/` (Market Context Protocol - a custom name).

To avoid confusion with **Model Context Protocol** (Anthropic's standard for LLM tools), it has been renamed to `bot-service/`.

A true Model Context Protocol server may be added in Wave 2 to expose tools like `get_bot_prediction()` for LLM access.
