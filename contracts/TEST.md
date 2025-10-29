# Bot-State Contract Testing Guide

**Status:** Wave 1 - Single Bot MVP Implementation
**Last Updated:** 2025-10-26

---

## Overview

This guide walks you through testing the `bot-state` Linera contract implementation step-by-step. Follow these phases in order to verify all functionality.

## Prerequisites

### Required Tools
```bash
# Verify installations
rustc --version      # Should be 1.70+
cargo --version      # Should be 1.70+
linera --version     # Should be 0.15.4
pnpm --version       # For future MCP integration
```

### Initial Setup
```bash
# From project root
cd /Users/vywwong/codebase_exp/linera-eth-pred

# Ensure all dependencies are ready
make setup           # If not already done
```

---

## Phase 1: Unit Testing (Local - No Network)

### 1.1 Run All Unit Tests

```bash
cd contracts
cargo test --quiet
```

**Expected Output:**
```
running 2 tests (contract.rs)
..
test result: ok. 2 passed

running 2 tests (service.rs)
..
test result: ok. 2 passed

running 10 tests (unit_tests.rs)
..........
test result: ok. 10 passed
```

**✅ Success Criteria:** All 14 tests pass

---

### 1.2 Verify Individual Test Suites

#### Contract Tests
```bash
cd contracts
cargo test --bin bot_state_contract
```

**Tests Covered:**
- ✅ `test_submit_prediction` - Verifies signal submission updates state
- ✅ `test_follower_count` - Verifies add/remove follower operations

#### Service Tests
```bash
cargo test --bin bot_state_service
```

**Tests Covered:**
- ✅ `test_query_bot_id` - GraphQL query returns correct bot_id
- ✅ `test_query_follower_count` - GraphQL query returns correct count

#### Business Logic Tests
```bash
cargo test --test unit_tests
```

**Tests Covered:**
- ✅ Signal validation (confidence, price, reasoning length)
- ✅ Directional accuracy calculations (Buy/Sell/Hold)
- ✅ Accuracy metrics updates (RMSE, percentages)

---

### 1.3 Run Specific Test Cases

```bash
# Test signal validation
cargo test test_signal_validation

# Test accuracy metrics
cargo test test_accuracy_metrics

# Test directional predictions
cargo test test_directional_accuracy
```

**✅ Success Criteria:** Each test suite passes independently

---

## Phase 2: Build & Compile (WASM Target)

### 2.1 Check Development Build

```bash
cd contracts
cargo check
cargo clippy -- -D warnings
cargo fmt --check
```

**✅ Success Criteria:**
- No compilation errors
- No clippy warnings
- Code is formatted

---

### 2.2 Build WASM Binaries

```bash
cd bot-state

# Build contract binary
cargo build --release --target wasm32-unknown-unknown --bin bot_state_contract

# Build service binary
cargo build --release --target wasm32-unknown-unknown --bin bot_state_service
```

**Expected Artifacts:**
```
target/wasm32-unknown-unknown/release/
├── bot_state_contract.wasm
└── bot_state_service.wasm
```

**Verify File Sizes:**
```bash
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

**✅ Success Criteria:**
- Both WASM files created
- Contract WASM < 2MB
- Service WASM < 2MB

---

## Phase 3: Local Network Deployment

### 3.1 Start Local Linera Network

**Following Official Linera Documentation Workflow**

#### Step 1: Start the Network

```bash
# From project root
cd /Users/vywwong/codebase_exp/linera-eth-pred
make linera-local
```

**What This Does:**
- Starts Linera network in background with `linera net up --with-faucet`
- Faucet service runs on port 8080
- Network logs written to `infra/localnet/network.log`

**Expected Output:**
```
🚀 Starting network in background...

✅ Linera network started!

Next steps:
  1. Initialize wallet:    linera wallet init --faucet http://localhost:8080
  2. Request a chain:      linera wallet request-chain --faucet http://localhost:8080
  3. Verify setup:         linera wallet show
```

**Verify Network is Running:**
```bash
# Check faucet responds
curl http://localhost:8080

# Check network logs (if any issues)
tail -f infra/localnet/network.log
```

---

#### Step 2: Initialize Wallet

**Option A: Manual Commands**
```bash
# Initialize wallet with faucet
linera wallet init --faucet http://localhost:8080

# Request a chain from the faucet
linera wallet request-chain --faucet http://localhost:8080

# Verify wallet
linera wallet show
```

**Option B: Use Make Helper**
```bash
make wallet-init
```

**Expected Output:**
```
Initializing wallet with faucet...
✓ Wallet initialized successfully

Requesting chain from faucet...
✓ Chain requested successfully

✅ Wallet initialized!

╭──────────────────────────────────────────────────────────────────────╮
│ Chain Id            │ Balance                                         │
├─────────────────────┼─────────────────────────────────────────────────┤
│ e476...01 (default) │ 1000.                                           │
╰──────────────────────────────────────────────────────────────────────╯
```

**⚠️ Important Note:**
> A wallet is valid for the lifetime of its network. Every time a local network is restarted, the wallet needs to be removed and created again.

---

**✅ Success Criteria:**
- Network started and running in background
- `linera wallet show` displays at least 1 chain
- Faucet responds on port 8080 (curl http://localhost:8080)
- No errors in `infra/localnet/network.log`

---

### 3.2 Create Linera Project Configuration

Create `linera.toml` in `contracts/bot-state/`:

```toml
[project]
name = "bot-state"
version = "0.1.0"

[[contracts]]
name = "bot-state"
contract = "target/wasm32-unknown-unknown/release/bot_state_contract.wasm"
service = "target/wasm32-unknown-unknown/release/bot_state_service.wasm"
```

---

### 3.3 Publish Contract to Local Network

```bash
cd contracts/bot-state

# Build first
cargo build --release --target wasm32-unknown-unknown

# Publish bytecode
linera project publish \
  --bytecode-path target/wasm32-unknown-unknown/release
```

**Expected Output:**
```
Bytecode ID: <BYTECODE_HASH>
Published successfully
```

**📝 Note:** Save the `BYTECODE_ID` - you'll need it for deployment

---

### 3.4 Create Application Instance

```bash
# Create application with bot_id "momentum-bot"
linera project create-application \
  --bytecode-id <BYTECODE_ID> \
  --instantiation-argument "momentum-bot"
```

**Expected Output:**
```
Application ID: <APPLICATION_ID>
Chain ID: <CHAIN_ID>
GraphQL endpoint: http://localhost:8080/<CHAIN_ID>
```

**📝 Note:** Save these IDs for testing

**✅ Success Criteria:** Application created, GraphQL endpoint available

---

## Phase 4: GraphQL Query Testing

### 4.1 Test Basic State Queries

**Query Bot ID:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ botId }"}'
```

**Expected Response:**
```json
{
  "data": {
    "botId": "momentum-bot"
  }
}
```

---

**Query Follower Count:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ followerCount }"}'
```

**Expected Response:**
```json
{
  "data": {
    "followerCount": 0
  }
}
```

---

### 4.2 Test Complex Queries

**Query All Bot State:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      botId
      latestSignal {
        timestamp
        action
        predictedPrice
        confidence
        reasoning
      }
      accuracy24h {
        rmse
        directionalAccuracy
        totalPredictions
      }
      followerCount
    }"
  }'
```

**Expected Response (Initial State):**
```json
{
  "data": {
    "botId": "momentum-bot",
    "latestSignal": null,
    "accuracy24h": {
      "rmse": 0.0,
      "directionalAccuracy": 0.0,
      "totalPredictions": 0
    },
    "followerCount": 0
  }
}
```

**✅ Success Criteria:** All queries return expected initial state

---

## Phase 5: Mutation Testing

### 5.1 Submit First Prediction

**Mutation:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900000000,
        action: BUY,
        predictedPrice: 2650.0,
        confidence: 0.75,
        reasoning: \"Strong momentum indicators, RSI oversold\"
      )
    }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "submitPrediction": null
  }
}
```

---

**Verify Signal Was Stored:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      latestSignal {
        timestamp
        action
        predictedPrice
        confidence
        reasoning
        actualPrice
      }
    }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "latestSignal": {
      "timestamp": 1729900000000,
      "action": "BUY",
      "predictedPrice": 2650.0,
      "confidence": 0.75,
      "reasoning": "Strong momentum indicators, RSI oversold",
      "actualPrice": null
    }
  }
}
```

**✅ Success Criteria:** Signal stored correctly, actualPrice is null

---

### 5.2 Resolve Prediction

**Mutation:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      resolveSignal(
        timestamp: 1729900000000,
        actualPrice: 2680.0
      )
    }"
  }'
```

**Verify Accuracy Updated:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      latestSignal { actualPrice }
      accuracy24h {
        totalPredictions
        correctPredictions
        directionalAccuracy
        rmse
      }
    }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "latestSignal": {
      "actualPrice": 2680.0
    },
    "accuracy24h": {
      "totalPredictions": 1,
      "correctPredictions": 1,
      "directionalAccuracy": 100.0,
      "rmse": 30.0
    }
  }
}
```

**✅ Success Criteria:**
- actualPrice updated to 2680.0
- Prediction marked as correct (BUY and price went up)
- Accuracy metrics calculated correctly

---

### 5.3 Test Follower Operations

**Add Follower:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { addFollower }"}'
```

**Verify Count:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ followerCount }"}'
```

**Expected:** `{"data": {"followerCount": 1}}`

**Add More Followers:**
```bash
# Add 4 more
for i in {1..4}; do
  curl -X POST http://localhost:8080/<CHAIN_ID> \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { addFollower }"}'
done
```

**Verify Count:** Should be 5

**Remove Follower:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { removeFollower }"}'
```

**Verify Count:** Should be 4

**✅ Success Criteria:** Follower count increments/decrements correctly

---

## Phase 6: Edge Case Testing

### 6.1 Test Signal Validation

**Invalid Confidence (> 1.0):**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900001000,
        action: BUY,
        predictedPrice: 2650.0,
        confidence: 1.5,
        reasoning: \"Test\"
      )
    }"
  }'
```

**Expected:** Error message about confidence validation

---

**Negative Price:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900002000,
        action: BUY,
        predictedPrice: -100.0,
        confidence: 0.5,
        reasoning: \"Test\"
      )
    }"
  }'
```

**Expected:** Error about positive price requirement

---

**Reasoning Too Long (> 512 chars):**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation {
      submitPrediction(
        timestamp: 1729900003000,
        action: BUY,
        predictedPrice: 2650.0,
        confidence: 0.5,
        reasoning: \\\"$(printf 'a%.0s' {1..600})\\\"
      )
    }\"
  }"
```

**Expected:** Error about 512 character limit

**✅ Success Criteria:** All validation errors caught correctly

---

### 6.2 Test Timestamp Ordering

**Submit Signal with Old Timestamp:**
```bash
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729800000000,
        action: SELL,
        predictedPrice: 2600.0,
        confidence: 0.8,
        reasoning: \"Bearish reversal\"
      )
    }"
  }'
```

**Expected:** Error - timestamp must be greater than previous signal

**✅ Success Criteria:** Monotonic timestamp enforcement works

---

### 6.3 Test Multiple Predictions Cycle

**Scenario:** Submit 3 predictions and resolve them

```bash
# Prediction 1: BUY at 2650
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900010000,
        action: BUY,
        predictedPrice: 2650.0,
        confidence: 0.75,
        reasoning: \"Bullish momentum\"
      )
    }"
  }'

# Resolve: Actual price 2680 (correct prediction)
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      resolveSignal(timestamp: 1729900010000, actualPrice: 2680.0)
    }"
  }'

# Prediction 2: SELL at 2680
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900020000,
        action: SELL,
        predictedPrice: 2680.0,
        confidence: 0.65,
        reasoning: \"Overbought RSI\"
      )
    }"
  }'

# Resolve: Actual price 2700 (incorrect prediction)
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      resolveSignal(timestamp: 1729900020000, actualPrice: 2700.0)
    }"
  }'

# Check accuracy
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      accuracy24h {
        totalPredictions
        correctPredictions
        directionalAccuracy
      }
    }"
  }'
```

**Expected Accuracy:**
- totalPredictions: 2
- correctPredictions: 1
- directionalAccuracy: 50.0

**✅ Success Criteria:** Accuracy metrics track multiple predictions correctly

---

## Phase 7: Integration Testing

### 7.1 Test Complete Workflow

**Complete hourly prediction workflow:**

1. **Bot submits prediction** (simulating MCP server)
2. **Wait 1 hour** (simulated)
3. **Resolve with actual price**
4. **Verify accuracy updated**
5. **Submit next prediction**

```bash
# Prediction 1: timestamp 1000
# ... submit and resolve

# Prediction 2: timestamp 2000 (1 hour later in simulation)
# ... submit and resolve

# Prediction 3: timestamp 3000
# ... submit and resolve

# Verify all 3 tracked
curl -X POST http://localhost:8080/<CHAIN_ID> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ accuracy24h { totalPredictions } }"}'
```

**Expected:** totalPredictions should be 3

**✅ Success Criteria:** Full prediction lifecycle works end-to-end

---

### 7.2 Load Testing (Optional)

**Submit 100 predictions rapidly:**

```bash
for i in {1..100}; do
  timestamp=$((1729900000000 + i * 1000))
  curl -s -X POST http://localhost:8080/<CHAIN_ID> \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation {
        submitPrediction(
          timestamp: $timestamp,
          action: BUY,
          predictedPrice: 2650.0,
          confidence: 0.75,
          reasoning: \\\"Test $i\\\"
        )
      }\"
    }" &
done
wait

# Should only accept 1 (last one), due to timestamp validation
```

**✅ Success Criteria:** State remains consistent under concurrent requests

---

## Phase 8: Cleanup & Verification

### 8.1 Stop Local Network

```bash
make stop-local
```

### 8.2 Review Test Results

**Create test report:**

```bash
cd contracts
cat > TEST_RESULTS.md << 'EOF'
# Bot-State Contract Test Results

**Date:** $(date)

## Unit Tests
- Contract tests: ✅ PASS (2/2)
- Service tests: ✅ PASS (2/2)
- Business logic: ✅ PASS (10/10)

## WASM Build
- Contract binary: ✅ BUILT
- Service binary: ✅ BUILT

## Network Deployment
- Publish bytecode: ✅ SUCCESS
- Create application: ✅ SUCCESS
- GraphQL endpoint: ✅ AVAILABLE

## GraphQL Queries
- Query botId: ✅ PASS
- Query latestSignal: ✅ PASS
- Query accuracy24h: ✅ PASS
- Query followerCount: ✅ PASS

## Mutations
- submitPrediction: ✅ PASS
- resolveSignal: ✅ PASS
- addFollower: ✅ PASS
- removeFollower: ✅ PASS

## Edge Cases
- Signal validation: ✅ PASS
- Timestamp ordering: ✅ PASS
- Multiple predictions: ✅ PASS

## Overall Status
**✅ ALL TESTS PASSED - READY FOR WAVE 1 DEPLOYMENT**
EOF
```

---

## Troubleshooting

### Common Issues

**Issue: `linera` command not found**
```bash
cargo install linera-service --locked
```

**Issue: WASM build fails**
```bash
rustup target add wasm32-unknown-unknown
```

**Issue: `linera wallet show` returns "No wallet configured"**
```bash
# Initialize wallet with faucet
linera wallet init --faucet http://localhost:8080
linera wallet request-chain --faucet http://localhost:8080

# Or use the helper
make wallet-init
```

**Issue: GraphQL endpoint not responding**
```bash
# Check if network is running
ps aux | grep linera

# Check network logs
tail -f infra/localnet/network.log

# Restart network
make stop-local
make wallet-clean  # Remove old wallet
make linera-local
make wallet-init   # Create new wallet
```

**Issue: Network restart workflow**
```bash
# Full restart procedure (wallet gets invalidated!)
make stop-local      # Stop network
make wallet-clean    # Remove old wallet (REQUIRED)
make linera-local    # Start network again
make wallet-init     # Create new wallet
```

**Issue: Application not found**
```bash
# List all applications
linera project list-applications
```

**Issue: Invalid timestamp error**
```bash
# Make sure each new prediction has timestamp > previous
# Use current unix timestamp: date +%s%3N
```

**Issue: Port 8080 already in use**
```bash
# Check what's using port 8080
lsof -i :8080

# Kill old processes
make stop-local

# Or change faucet port in Makefile
# Edit line 31: --faucet-port 8081
```

---

## Next Steps

Once all tests pass:

1. ✅ **Wave 1 Complete** - Bot state contract working
2. 🔄 **Next:** Build MCP server (market data fetcher + scheduler)
3. 🔄 **Next:** Build frontend (dashboard to display signals)
4. 🔄 **Next:** Integrate all 3 layers

---

## Test Checklist

Use this checklist to track your progress:

- [ ] Phase 1: Unit tests (14/14 passing)
- [ ] Phase 2: WASM build (both binaries created)
- [ ] Phase 3: Local network (validator running)
- [ ] Phase 4: GraphQL queries (all 4 queries working)
- [ ] Phase 5: Mutations (all 4 mutations working)
- [ ] Phase 6: Edge cases (validation enforced)
- [ ] Phase 7: Integration (full workflow tested)
- [ ] Phase 8: Cleanup (results documented)

**Target:** 100% completion before moving to Wave 2

---

**End of Testing Guide**
