# AlphaBot – Linera ETH Prediction Bots

AlphaBot is a transparent copy-trading platform where specialized AI bots publish ETH price predictions on Linera microchains. Users inspect on-chain performance, follow top bots, and receive low-latency signal notifications.

- **Vision:** Prove AI trading strategies can operate transparently and verifiably on-chain.
- **Current Status:** ✅ Wave 1 Complete – ⚙️ Wave 2 In Progress (LLM integration with Gemma 3 27B via inference.net)

## 🚀 Quick Start

**New users:** See **[QUICKSTART.md](./QUICKSTART.md)** for a step-by-step guide to get running in under 10 minutes!

### TL;DR (For Experienced Users)

```bash
# 1. Setup environment
./setup-env.sh

# 2. Start Linera network (host)
make linera-local && make wallet-init

# 3. Deploy contract
export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
export LINERA_KEYSTORE="$PWD/infra/localnet/keystore.json"
export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"
cd contracts && linera project publish-and-create bot-state --json-argument '"my-bot"'

# 4. Update scheduler/.env and frontend/.env.local with GraphQL URLs

# 5. Start services
docker compose up -d

# 6. Open http://localhost:3000
```

### Docker Compose Services

The application consists of three containerized services:
- **scheduler** (port internal): Cron-based prediction trigger (Just-in-Time Oracle)
- **external-service-mirror** (port 3002): HTTP proxy for contract API calls
- **frontend** (port 3000): Next.js dashboard

**Note:** Linera network runs on the host machine, not in Docker.

## Repository Layout
- `contracts/` – Linera application code (Rust) and integration tests.
- `bot-service/` – Node.js market data ingestion (Binance), strategy execution (SimpleMA), and prediction orchestration.
- `frontend/` – Next.js dashboard displaying bot state, predictions, and accuracy metrics.
- `infra/` – Deployment scripts, local Linera configuration, and devops assets.
- `docs/` – Architecture blueprint and workflow guidance.
- `Dockerfile` – Container configuration for buildathon deployment
- `compose.yaml` – Docker Compose orchestration
- `run.bash` – Build and execution script

See `docs/architecture.md` for detailed diagrams and component responsibilities.

## Local Development (Without Docker)

### Prerequisites
- Rust (latest stable)
- Node.js 18+ with pnpm
- Linera CLI (`cargo install linera`)

### Setup
```bash
# One-time setup
make setup    # Install toolchains
make env      # Copy .env.example files

# Start local Linera validator
make linera-local

# Run bot service with live predictions
cd bot-service && pnpm dev

# Start frontend dashboard (separate terminal)
cd frontend && pnpm dev
# Open http://localhost:3000
```

### Testing
```bash
make check    # Run all linters and tests
make test     # Run test suites (contracts + bot-service + frontend)
make e2e      # Full E2E test (Linera + contracts + integration test)
```

See `E2E_TESTING.md` for comprehensive E2E testing guide.

## Multi-Bot Parallel Deployment (Docker Compose)

Run multiple bot strategies simultaneously for performance comparison:

```bash
# Build and start all bots in parallel (qwen-vertex, gpt-oss-vertex, simple-ma, deepseek)
make bots-build
make bots-up

# View logs from all bots
make bots-logs

# Stop all bots
make bots-down
```

Each bot runs independently with a different `STRATEGY` environment variable:
- **bot-qwen**: Qwen 3 Coder 480B via Vertex AI
- **bot-gpt-oss**: GPT OSS 120B via Vertex AI
- **bot-simple-ma**: Simple Moving Average (deterministic baseline)
- **bot-deepseek**: DeepSeek V3 via cloud API

See bot-service strategy documentation for detailed configuration guides.

---

## Tagline

*Transparent AI trading bots on Linera microchains - verifiable predictions, no centralized trust.*

AlphaBot empowers users to discover, follow, and create AI-powered ETH prediction bots with fully transparent on-chain track records. Built on Linera's microchain architecture, every prediction is verifiable and immutable. Wave 1 delivers a working single-bot system with real-time Binance data, on-chain accuracy tracking, and a live dashboard. Future waves enable LLM-powered strategies, multi-bot competition, and a no-code bot builder where users customize prompts and connect MCP data sources to create their own strategies.

## The Problem It Solves

Traditional trading signals and bot platforms suffer from:
- **Lack of transparency**: Past performance can be fabricated or cherry-picked
- **Centralized trust**: Users must trust platform operators not to manipulate data
- **High barriers to entry**: Building trading bots requires significant technical expertise
- **Limited strategy diversity**: Most platforms offer generic indicators, not AI-driven insights

AlphaBot solves these by:
- Storing all predictions immutably on Linera microchains before price outcomes are known
- Enabling transparent, verifiable accuracy calculations anyone can audit
- Providing a future no-code bot builder where users customize LLM prompts without coding
- Creating a competitive marketplace where AI strategies can prove themselves fairly

## Challenges I Ran Into

1. **Fixed-Point Arithmetic**: Linera contracts require deterministic calculations, so I implemented micro-USD (6 decimals) and basis points (2 decimals) conversion for accurate price and confidence storage.

2. **GraphQL Client Compatibility**: Standard GraphQL libraries had issues with Linera's auto-generated endpoints. Switched to native `fetch` with manual query construction for reliability.

3. **State Management Strategy**: Balancing on-chain storage (gas costs) vs off-chain analytics. Decided to store only latest prediction on-chain for Wave 1, with full historical data in PostgreSQL planned for Wave 2+.

4. **Real-Time Data Flow**: Coordinating 60s bot prediction cycles with 5s frontend polling while ensuring data consistency and handling network failures gracefully.

5. **Testing Microchain Interactions**: Building comprehensive E2E tests that deploy contracts, submit predictions, and verify state changes required custom test harness and careful setup/teardown.

## Technologies I Used

- **Linera Protocol**: Microchain-based blockchain for isolated bot state and auto-generated GraphQL APIs
- **Rust + Linera SDK**: Smart contract development with WebAssembly compilation
- **Node.js + TypeScript**: Bot orchestration service for market data and strategy execution
- **Binance API**: Real-time ETH price data and historical kline data
- **Next.js 16**: React-based frontend with App Router and server components
- **TailwindCSS + shadcn/ui**: Modern UI component library
- **Vitest**: Fast unit testing for bot service logic
- **pnpm Workspaces**: Monorepo management for multi-package project

## How We Built It

**Phase 1 - Contract Foundation (Days 1-3)**:
- Designed minimal on-chain state schema (latest prediction + 24h accuracy only)
- Implemented fixed-point arithmetic for deterministic calculations
- Built GraphQL operations for prediction submission and state queries

**Phase 2 - Bot Service (Days 4-7)**:
- Created Binance market data fetcher with retry logic and caching
- Implemented SimpleMA strategy (SMA20/SMA50 crossover) as baseline
- Built orchestrator with 60s prediction cycle and error handling
- Integrated Linera client for GraphQL mutations

**Phase 3 - Frontend Dashboard (Days 8-10)**:
- Built Next.js dashboard with bot state display and prediction charts
- Implemented 5s auto-refresh polling with native fetch
- Added conversion utilities for micro-USD → USD display
- Created responsive UI with loading states and error boundaries

**Phase 4 - Integration & Testing (Days 11-14)**:
- Wrote comprehensive E2E tests covering full prediction flow
- Validated fixed-point conversion accuracy (100% match USD ↔ micro-USD)
- Tested with live Binance data on local Linera validator
- Documented architecture and development workflow

**Key Design Decisions**:
- Microchain isolation: Each bot runs independently on dedicated chain
- Pluggable strategies: Common interface allows easy strategy swapping
- Test-first development: Unit tests written before implementation
- Makefile orchestration: Single commands for complex multi-service workflows

## What We Learned

1. **Linera's Microchain Model**: Understanding how isolated application chains enable independent bot scaling and parallel execution was crucial for architecture design.

2. **On-Chain vs Off-Chain Trade-offs**: Not everything belongs on-chain. Storing only essential state (latest prediction, accuracy metrics) keeps gas costs low while enabling rich analytics off-chain.

3. **Fixed-Point Math Importance**: Float precision issues can destroy deterministic contract behavior. Converting to micro-USD and basis points early prevents subtle bugs.

4. **GraphQL Auto-Generation**: Linera's contract-to-GraphQL generation is powerful but requires understanding query construction and type mapping differences from traditional GraphQL servers.

5. **Testing Strategy**: E2E tests that deploy contracts, submit transactions, and verify state are essential but require careful environment setup. Unit tests for business logic provide fast feedback loops.

6. **Market Data Reliability**: External APIs fail. Implementing retry logic, caching, and graceful degradation is critical for production-ready bots.

## Decentralized Architecture Vision

AlphaBot's true innovation lies in its **fully decentralized inference and storage architecture**, currently being developed for Wave 2+:

### Beyond "Blockchain as Storage"

**Current (Wave 1):** SimpleMA strategy runs off-chain in bot-service → Stores results on Linera
**Wave 2 (In Progress):** LLM inference in service.rs using `runtime.http_request()` (atoma-demo pattern) → Gemma 3 27B via inference.net
**Vision (Wave 3+):** User prompts on Walrus → Atoma LLM inference → Results on Linera

### Three Pillars of Decentralization

**1. Decentralized Storage (Walrus)**
- User-created bot prompts stored on Walrus network
- Immutable, content-addressed prompt artifacts
- Each bot references a Walrus blob_id in its Linera contract

**2. Decentralized Compute (Atoma Network)**
- LLM inference executed on Atoma's distributed GPU nodes
- Verifiable compute proofs for all predictions
- Contract calls Atoma API: `https://api.atoma.network/v1/chat/completions`
- Supports Llama-3.3-70B, Qwen, Mistral, and other open models

**3. Decentralized Blockchain (Linera)**
- Each bot runs on dedicated microchain
- Orchestrates Atoma inference calls from contract service
- Stores signals + accuracy metrics on-chain
- Auto-generated GraphQL for all bot interactions

### User-Created Bot Platform

**The Real Goal:** Enable anyone to create AI trading bots through prompt engineering:

```
User writes prompt → Upload to Walrus → Deploy bot microchain →
  → Bot fetches market data → Calls Atoma for inference →
  → Stores prediction on Linera → Users follow successful bots
```

**No coding required** - just design your strategy as a prompt:
- System prompt: "You are a momentum trader specializing in..."
- User prompt template: "Current ETH price: ${price}. Predict next hour..."
- Parameters: model, temperature, max_tokens

### Current Status

**Timeline:** Atoma integration planned for Wave 3+ (pending API access from Atoma team)
**Wave 1:** ✅ Complete - Deterministic SimpleMA strategy (production-ready)
**Wave 2:** ⚙️ In Progress - LLM integration using Linera's HTTP request capabilities (following atoma-demo pattern)
**Roadmap:** See `PROGRESS_SUMMARIES/DECENTRALIZED_INFERENCE_ARCHITECTURE.md` for complete technical spec

**This architecture directly addresses feedback that "AlphaBot uses blockchain for storage only"** - the vision leverages blockchain for orchestration, Atoma for decentralized compute, and Walrus for prompt storage. Fully decentralized, fully verifiable. Current Wave 1 demonstrates working system with path to full decentralization.

## What's Next for AlphaBot

**Wave 2 (In Progress - LLM Integration + Deployment)**:
- ⚙️ **LLM inference in service.rs** using `runtime.http_request()` (atoma-demo pattern)
- ✅ Gemma 3 27B integration via inference.net API
- ✅ Market data fetching from Binance in service layer
- ✅ DeepSeek V3 strategy implemented in bot-service
- 🔄 Testing HTTP authorization in Linera localnet (resource-control-policy)
- 📋 Add PostgreSQL for full historical prediction archive and analytics
- 📋 Build accuracy dashboard with RMSE, directional accuracy, and win rate charts
- 📋 Implement follow/unfollow functionality with follower count tracking
- 📋 Compare LLM vs SimpleMA performance on leaderboard
- 📋 **Deploy frontend to Vercel** for global access
- 📋 **Deploy contracts to Linera public chain** (devnet/mainnet)
- 📋 **Deploy bot-service to GCP Cloud Run** with hourly predictions
- 📋 WebSocket notification preview for real-time updates

**Wave 3 (4-8 weeks - Decentralized Inference)**:
- **Migrate from local LLMs to Atoma Network** for decentralized inference (pending API access)
- **Integrate Walrus** for prompt storage and versioning
- Enable prompt-based bot creation UI (no coding required)
- Deploy user-created bots on dedicated microchains
- Implement Socket.io real-time notifications (<2s latency)
- Launch bot marketplace for discovery and performance comparison
- Multi-bot leaderboard with 5+ competing strategies

**Wave 4 (Long-term - 2-3 months)**:
- Launch full community bot builder platform
- Provide prompt templates for common strategies
- Add backtesting interface and one-click deployment
- Implement community sharing and prompt forking
- Build data marketplace for additional sources (Twitter sentiment, on-chain metrics)
- Enable revenue sharing for top bot creators

**Vision**: Transform AlphaBot into a decentralized bot creation platform where anyone can build sophisticated AI trading strategies through prompt engineering. Prompts on Walrus, inference on Atoma, track records on Linera - fully decentralized, fully verifiable.

---

## Video Demo

**Demo Video**: [YouTube URL]
*(Recording shows: Local Linera validator startup, bot service generating predictions, frontend dashboard displaying live signals and accuracy metrics)*

## Live Demo

**Live Demo URL**: [URL]
*(Currently running on local development environment - production deployment planned for Wave 2)*

## Built With

- Linera Protocol
- Rust
- WebAssembly
- Node.js
- TypeScript
- Binance API
- Next.js
- React
- TailwindCSS
- GraphQL
- pnpm

---

## Wave 1 Achievements ✅
- ✅ Linera smart contract deployed and verified
- ✅ Real-time ETH price data from Binance API
- ✅ SimpleMA trading strategy (SMA20/SMA50 crossover)
- ✅ On-chain prediction storage with accuracy tracking
- ✅ Frontend dashboard with auto-refresh (5s polling)
- ✅ Complete end-to-end flow validated
- ✅ Perfect fixed-point conversion accuracy (micro-USD ↔ USD)

## Roadmap
- **Wave 1 (Complete):** Single deterministic bot, hourly predictions, basic dashboard
- **Wave 2 (Next):** LLM-powered predictions (Qwen2.5), multi-bot deployment, enhanced UI
- **Wave 3 (Future):** Five competing bots, leaderboard, WebSocket notifications, copy-trade UX

See `TODO.md` for detailed progress tracking and next steps.
