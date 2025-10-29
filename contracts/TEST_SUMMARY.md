# TEST.md Summary - Updated Official Workflow

**Status:** ✅ Fully updated to follow official Linera documentation
**Date:** 2025-10-26

---

## Complete Testing Flow

### Phase 1: Unit Testing ✅ (Already Complete)
```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred/contracts
cargo test --quiet
```
**Result:** 14/14 tests passing

---

### Phase 2: Build WASM Binaries
```bash
cd bot-state
cargo build --release --target wasm32-unknown-unknown
```
**Creates:**
- `target/wasm32-unknown-unknown/release/bot_state_contract.wasm`
- `target/wasm32-unknown-unknown/release/bot_state_service.wasm`

---

### Phase 3: Local Network Deployment (UPDATED! ⚡)

#### Step 3.1a: Start Network
```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred
make linera-local
```

**What happens:**
- Network starts in background
- Faucet runs on port 8080
- Logs → `infra/localnet/network.log`

**Expected output:**
```
🚀 Starting network in background...
✅ Linera network started!

Next steps:
  1. Initialize wallet:    linera wallet init --faucet http://localhost:8080
  2. Request a chain:      linera wallet request-chain --faucet http://localhost:8080
  3. Verify setup:         linera wallet show
```

---

#### Step 3.1b: Initialize Wallet
```bash
make wallet-init
```

**What happens:**
- Creates wallet at `~/.config/linera/wallet.json`
- Requests chain from faucet
- Gives you tokens

**Expected output:**
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

✅ **Success:** You now have a working wallet with a funded chain!

---

#### Step 3.2: Verify Network
```bash
# Check faucet
curl http://localhost:8080

# Check wallet
linera wallet show

# Check processes
ps aux | grep linera
```

**Expected processes:**
- `linera-proxy` - GraphQL proxy
- `linera-server` - Validator
- `linera service` - Faucet

---

#### Step 3.3: Publish Contract
```bash
cd contracts/bot-state
linera project publish-and-create bot-state
```

**Expected output:**
```
Publishing bytecode...
Bytecode ID: e476...

Creating application...
Application ID: e476..._abcd...
Chain ID: e477...

GraphQL endpoint: http://localhost:8080/chains/e477...
```

📝 **Save the Chain ID for Phase 4!**

---

### Phase 4: GraphQL Query Testing

#### Query Bot ID
```bash
CHAIN_ID="e477..."  # Replace with your chain ID

curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ botId }"}'
```

**Expected:**
```json
{
  "data": {
    "botId": "bot-state"
  }
}
```

#### Query Full State
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
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

**Expected (initial state):**
```json
{
  "data": {
    "botId": "bot-state",
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

---

### Phase 5: Mutation Testing

#### Submit Prediction
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729900000000,
        action: BUY,
        predictedPrice: 2650.0,
        confidence: 0.75,
        reasoning: \"Strong momentum indicators\"
      )
    }"
  }'
```

**Verify:**
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ latestSignal { action predictedPrice } }"}'
```

**Expected:**
```json
{
  "data": {
    "latestSignal": {
      "action": "BUY",
      "predictedPrice": 2650.0
    }
  }
}
```

---

#### Resolve Signal
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
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
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ accuracy24h { directionalAccuracy totalPredictions } }"}'
```

**Expected:**
```json
{
  "data": {
    "accuracy24h": {
      "directionalAccuracy": 100.0,
      "totalPredictions": 1
    }
  }
}
```

---

#### Test Followers
```bash
# Add follower
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { addFollower }"}'

# Verify count
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ followerCount }"}'
```

**Expected:**
```json
{"data": {"followerCount": 1}}
```

---

### Phase 6: Edge Case Testing

#### Invalid Confidence
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
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

**Expected:** Error about confidence validation

---

#### Old Timestamp
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation {
      submitPrediction(
        timestamp: 1729800000000,
        action: SELL,
        predictedPrice: 2600.0,
        confidence: 0.8,
        reasoning: \"Old timestamp\"
      )
    }"
  }'
```

**Expected:** Error - timestamp must be greater than previous

---

### Phase 7: Integration Testing

**Complete 3-prediction workflow:**

1. Submit prediction #1 → timestamp 1000
2. Resolve prediction #1 → actual_price
3. Submit prediction #2 → timestamp 2000
4. Resolve prediction #2 → actual_price
5. Submit prediction #3 → timestamp 3000
6. Query accuracy → should show 3 total predictions

---

### Phase 8: Cleanup

```bash
make stop-local
```

**If you need to restart:**
```bash
make stop-local      # Stop network
make wallet-clean    # Remove wallet (REQUIRED!)
make linera-local    # Start network
make wallet-init     # Create new wallet
```

---

## Key Changes from Old Workflow

| Old | New (Official) |
|-----|---------------|
| `source infra/localnet/env` | ❌ Not needed |
| Wallet auto-created | ✅ Manual via `make wallet-init` |
| Wallet in `infra/localnet/` | ✅ Wallet in `~/.config/linera/` |
| Network runs foreground | ✅ Runs in background with nohup |

---

## Troubleshooting Quick Reference

**No wallet configured:**
```bash
make wallet-init
```

**Network not running:**
```bash
ps aux | grep linera
tail -f infra/localnet/network.log
```

**Full restart:**
```bash
make stop-local
make wallet-clean
make linera-local
make wallet-init
```

**Port 8080 in use:**
```bash
lsof -i :8080
make stop-local
```

---

## Test Checklist

- [ ] Phase 1: Unit tests (14/14 passing)
- [ ] Phase 2: WASM build (both binaries created)
- [ ] Phase 3a: Network started (`make linera-local`)
- [ ] Phase 3b: Wallet initialized (`make wallet-init`)
- [ ] Phase 3c: Contract published
- [ ] Phase 4: All 4 GraphQL queries working
- [ ] Phase 5: All 4 mutations working
- [ ] Phase 6: Edge case validation enforced
- [ ] Phase 7: Full workflow tested
- [ ] Phase 8: Cleanup successful

---

## Success Metrics

✅ **Wave 1 Complete When:**
- All 14 unit tests pass
- WASM binaries build successfully
- Contract deploys to local network
- GraphQL queries return expected data
- Mutations update state correctly
- Validation catches invalid inputs
- Network restarts cleanly

**Status:** Ready for production testing! 🚀
