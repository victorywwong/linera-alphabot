# AlphaBot Quick Start Guide

**Get AlphaBot running in under 10 minutes** ⚡

This guide shows you how to run the full AlphaBot stack locally using Docker Compose.

---

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

That's it! All other dependencies are handled inside containers.

---

## Quick Start (Recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/linera-alphabot.git
cd linera-alphabot
```

### 2. Setup Environment Variables

```bash
./setup-env.sh
```

This creates `.env` files from templates in:
- `scheduler/.env`
- `external-service-mirror/.env`
- `bot-service/.env`
- `frontend/.env.local`

### 3. Configure API Keys

Edit `external-service-mirror/.env` and add your inference.net API key:

```bash
# Get free API key from: https://inference.net/dashboard
INFERENCE_API_KEY=your_inference_net_api_key_here
```

**Optional:** If using LLM strategies, also add the same key to `scheduler/.env`:

```bash
INFERENCE_API_KEY=your_inference_net_api_key_here
```

### 4. Start Linera Network (Host)

The Linera network runs on your host machine (not in Docker):

```bash
make linera-local
```

Wait ~5 seconds for the network to start, then:

```bash
make wallet-init
```

You should see output like:
```
✅ Wallet initialized in infra/localnet/
```

### 5. Deploy the Bot Contract

```bash
# Set wallet environment variables
export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
export LINERA_KEYSTORE="$PWD/infra/localnet/keystore.json"
export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"

# Deploy contract
cd contracts
linera project publish-and-create bot-state --json-argument '"my-bot"'
```

**Save the output!** You'll see something like:
```
Application published successfully!
Application ID: {APP_ID}
Chain ID: {CHAIN_ID}
GraphQL endpoint: http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID}
```

### 6. Configure Scheduler

Edit `scheduler/.env` and update the GraphQL URL with your actual chain/app IDs:

```bash
LINERA_GRAPHQL_URL=http://host.docker.internal:8081/chains/{CHAIN_ID}/applications/{APP_ID}
STRATEGY=simple-ma
CRON_SCHEDULE=*/5 * * * *  # Every 5 minutes (faster than default)
```

**Note:** Use `host.docker.internal` instead of `localhost` to allow the container to reach your host machine.

### 7. Configure Frontend

Edit `frontend/.env.local`:

```bash
NEXT_PUBLIC_LINERA_GRAPHQL_URL=http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID}
```

### 8. Start All Services

```bash
docker compose up -d
```

This starts:
- **scheduler**: Triggers predictions every 5 minutes
- **external-service-mirror**: HTTP proxy on port 3002
- **frontend**: Next.js dashboard on port 3000

### 9. Verify Everything is Running

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f scheduler
docker compose logs -f external-service-mirror
docker compose logs -f frontend
```

### 10. Access the Dashboard

Open http://localhost:3000 in your browser!

You should see:
- Bot ID
- Latest prediction (after first scheduler run)
- Accuracy metrics
- Signal history chart

---

## Architecture Overview

```
┌─────────────┐
│  scheduler  │ ──(GraphQL)──> Linera Contract (localhost:8081)
│ (Docker)    │                        │
└─────────────┘                        │
                                       ├──(HTTP)──> external-service-mirror:3002
                                       │            ├─> api.binance.com
                                       │            └─> api.inference.net
                                       │
┌─────────────┐                        │
│  frontend   │ ──(GraphQL)───────────┘
│ (localhost  │
│    :3000)   │
└─────────────┘
```

---

## Testing the Flow

### Manual Prediction Trigger

Instead of waiting for the cron schedule, you can trigger a prediction manually:

```bash
# From the host (with wallet env vars set)
curl -X POST http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { executePrediction(strategy: \"simple-ma\") { timestamp action predictedPriceMicro confidenceBps reasoning } }"
  }'
```

### Check External Service Mirror

```bash
# Test Binance proxy
curl "http://localhost:3002/binance/ticker?symbol=ETHUSDT"

# Test inference.net proxy (if you have API key set)
curl -X POST "http://localhost:3002/inference/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-3-27b-instruct/bf-16",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 50
  }'
```

### Query Contract State

```bash
curl -X POST http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { botId latestSignal { timestamp action predictedPriceMicro confidenceBps reasoning } }"
  }'
```

---

## Common Issues

### Issue: "Cannot connect to Docker daemon"
**Solution:** Start Docker Desktop

### Issue: "Connection refused" on localhost:8081
**Solution:** Make sure you ran `make linera-local` on the host

### Issue: Scheduler can't reach Linera network
**Solution:** Use `host.docker.internal:8081` in scheduler/.env, not `localhost:8081`

### Issue: Frontend shows "Failed to fetch"
**Solution:**
1. Verify contract is deployed: `curl http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID}`
2. Check that you used the correct GraphQL URL in `frontend/.env.local`
3. Make sure the URL does NOT include `/graphql` suffix

### Issue: Scheduler logs show "Unauthorized" errors
**Solution:** Add `INFERENCE_API_KEY` to `scheduler/.env` if using LLM strategies

### Issue: External service mirror returns 401
**Solution:** Add `INFERENCE_API_KEY` to `external-service-mirror/.env`

---

## Stopping Services

```bash
# Stop Docker services
docker compose down

# Stop Linera network
make stop-local
```

**Important:** After stopping Linera, you'll need to clean the wallet before restarting:

```bash
make wallet-clean
```

Then repeat steps 4-8 to restart.

---

## Development Workflow

### Running Without Docker

If you prefer to run services locally without Docker:

```bash
# Terminal 1: Linera network
make linera-local && make wallet-init

# Terminal 2: External service mirror
cd external-service-mirror
pnpm install && pnpm dev

# Terminal 3: Frontend
cd frontend
pnpm install && pnpm dev
```

Then trigger predictions manually via GraphQL instead of using the scheduler.

### Running Tests

```bash
# All tests
make test

# Just contracts
make test-contracts

# Just external mirror
cd external-service-mirror && pnpm test

# Just frontend
cd frontend && pnpm test
```

### Linting

```bash
make lint
```

---

## Next Steps

- **Try LLM Strategies:** Change `STRATEGY=gemma` in `scheduler/.env` and restart
- **Multi-Bot Setup:** See `README.md` for running multiple strategies in parallel
- **Deploy to Testnet:** See `PROGRESS_SUMMARIES/WAVE_2_DEPLOYMENT.md`
- **Vercel Deployment:** See section below for live demo setup

---

## Live Demo Deployment (Vercel)

See `docs/VERCEL_DEPLOYMENT.md` for instructions on deploying the frontend to Vercel.

Key points:
- Frontend can be deployed to Vercel
- Point `NEXT_PUBLIC_LINERA_GRAPHQL_URL` to a public Linera testnet endpoint
- Scheduler and mirror must run on a server (can use Cloud Run, Fly.io, or Railway)

---

## Additional Resources

- **Architecture Details:** `docs/architecture.md`
- **Testing Guide:** `E2E_TESTING.md`
- **HTTP Proxy Details:** `PROGRESS_SUMMARIES/EXTERNAL_SERVICE_MIRROR.md`
- **LLM Integration:** `PROGRESS_SUMMARIES/WAVE_2_LLM_INTEGRATION.md`
- **Testnet Deployment:** `PROGRESS_SUMMARIES/WAVE_2_DEPLOYMENT.md`

---

## Support

For issues or questions:
- Check `PROGRESS_SUMMARIES/` for detailed guides
- Review `E2E_TESTING.md` for troubleshooting
- Open an issue on GitHub

Happy trading! 📈🤖
