# E2E Testing Guide - DEPRECATED

**⚠️ This guide is OUTDATED and uses the old bot-service approach.**

**✅ Use the NEW guide instead:** `/Users/vywwong/codebase_exp/linera-alphabot/E2E_TESTING.md`

## What Changed?

**Old Approach (this file - deprecated):**
```
Binance → bot-service (Node.js) → LLM APIs → Linera contract
```

**New Approach (use E2E_TESTING.md):**
```
service.rs → localhost:3002 → external-service-mirror → External APIs
                                                       ├→ api.binance.com
                                                       └→ api.inference.net
```

## Quick Start for New Flow

Follow these 4 steps in `/Users/vywwong/codebase_exp/linera-alphabot/E2E_TESTING.md`:

1. **Start external-service-mirror** (Terminal 1)
   ```bash
   cd external-service-mirror
   make mirror
   ```

2. **Start Linera network** (Terminal 2)
   ```bash
   make stop-local && make wallet-clean
   make linera-local
   sleep 5 && make wallet-init
   ```

3. **Deploy contract** (Terminal 3)
   ```bash
   export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
   export LINERA_KEYSTORE="$PWD/infra/localnet/keystore.json"
   export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"

   cd contracts
   cargo build --release --target wasm32-unknown-unknown
   linera project publish-and-create bot-state --json-argument '"alphabot-gemma-test"'
   ```

4. **Test via GraphQL** (Terminal 4)
   ```bash
   export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
   export LINERA_KEYSTORE="$PWD/infra/localnet/keystore.json"
   export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"

   linera service --port 8081 &
   open http://localhost:8081
   ```

Then run in GraphiQL:
```graphql
mutation {
  executePrediction(
    strategy: "gemma",
    apiKey: "your-inference-net-api-key"
  ) {
    timestamp
    action
    predictedPriceMicro
    confidenceBps
    reasoning
  }
}
```

## Why the Change?

The new approach tests the **actual production architecture** where:
- ✅ service.rs (Rust/WASM) makes HTTP requests directly
- ✅ Predictions are stored on-chain immediately
- ✅ Proves the full decentralized stack (contract → LLM → blockchain)

The old bot-service approach was a workaround that's no longer needed.

---

## For Reference: Old bot-service Tests (Deprecated)

The following tests are kept for reference but should NOT be used for the new flow.

### Old Test 1: SimpleMA Strategy (bot-service only)

**Purpose:** Verify basic pipeline works without LLM dependencies

### Steps:

1. **Configure Strategy**
   ```bash
   cd /Users/vywwong/codebase_exp/linera-alphabot/bot-service
   ```

2. **Update .env file**
   ```bash
   # Edit .env and set:
   STRATEGY=simple-ma
   BINANCE_BASE_URL=https://api.binance.com
   ```

3. **Run Bot Service**
   ```bash
   pnpm dev
   ```

4. **Expected Output:**
   ```
   Prediction interval: 60s

   [Orchestrator] Using SimpleMA strategy (baseline)
   [Orchestrator] Starting with 60000ms interval

   [Orchestrator] Cycle 1762721486803 started
   [Orchestrator] Fetching market snapshot...
   ✅ Orchestrator running. Press Ctrl+C to stop.

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [Orchestrator] Current price: $3579.99
   [Orchestrator] Generating prediction...
   [Orchestrator] Signal: HOLD @ $3589.53 (confidence: 50.0%)
   [Orchestrator] Reasoning: SMA20=$3453.69 vs SMA50=$3435.38 (+0.53%). Neutral trend. Current=$3579.99
   [Orchestrator] [SKIP] No Linera client configured
   [Orchestrator] [TODO] Log to PostgreSQL
   [Orchestrator] Cycle 1762721486803 completed successfully
   ```

   **Note:** Signal may be BUY, SELL, or HOLD depending on current market conditions. Price and SMA values will vary based on real-time Binance data.

5. **Verify Success Criteria:**
   - [ ] Bot starts without errors
   - [ ] Fetches real ETH price from Binance
   - [ ] Generates prediction (BUY/SELL/HOLD)
   - [ ] Shows reasoning text
   - [ ] Cycles every 60 seconds

6. **Stop the bot** (Ctrl+C)

### Troubleshooting:

- **Error: "Cannot find module"** → Run `pnpm install`
- **Error: "STRATEGY is not defined"** → Check `.env` file exists and has `STRATEGY=simple-ma`
- **Error: "Failed to fetch market data"** → Check internet connection

---

### Old Test 2: DeepSeek Strategy (bot-service only)

**Purpose:** Verify LLM integration with real API calls

### Prerequisites:

- [ ] DeepSeek API key (get from https://platform.deepseek.com)
- [ ] API key is valid and has credits

### Steps:

1. **Update .env file**
   ```bash
   # Edit .env and uncomment/set:
   STRATEGY=deepseek
   DEEPSEEK_API_KEY=sk-be853f5bfcc34f39b0706d01407388a4
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat
   ```

2. **Run Bot Service**
   ```bash
   pnpm dev
   ```

3. **Expected Output:**
   ```
   Prediction interval: 60s

   [Orchestrator] Using DeepSeek V3 strategy (Atoma-supported)
   [Orchestrator] Starting with 60000ms interval

   [Orchestrator] Cycle 1762721234567 started
   [Orchestrator] Fetching market snapshot...
   ✅ Orchestrator running. Press Ctrl+C to stop.

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [Orchestrator] Current price: $3579.99
   [Orchestrator] Generating prediction...
   [Orchestrator] Signal: BUY @ $3575.50 (confidence: 78.0%)
   [Orchestrator] Reasoning: Strong upward momentum with increasing volume and positive price action over last 6 hours. Breaking resistance at $3550.
   [Orchestrator] [SKIP] No Linera client configured
   [Orchestrator] [TODO] Log to PostgreSQL
   [Orchestrator] Cycle 1762721234567 completed successfully
   ```

   **Note:** LLM reasoning will vary based on current market conditions and model response. Inference takes 2-5 seconds.

4. **Verify Success Criteria:**
   - [ ] Bot starts without errors
   - [ ] Makes real API call to DeepSeek (takes 2-5 seconds)
   - [ ] Generates LLM-powered prediction
   - [ ] Reasoning is detailed (>50 characters)
   - [ ] Shows confidence percentage
   - [ ] Cost: ~$0.001 per prediction

5. **Test Error Handling**
   - Stop the bot (Ctrl+C)
   - Edit `.env` and set `DEEPSEEK_API_KEY=invalid-key`
   - Run `pnpm dev`
   - **Expected:** Bot should show error but not crash
   - **Expected Output:**
     ```
     [DeepSeekStrategy] Prediction error: Error: DeepSeek API error (401): Unauthorized
     [Orchestrator] Signal: HOLD @ $3515.52 (confidence: 10.0%)
     [Orchestrator] Reasoning: Error during prediction: DeepSeek API error (401): Unauthorized
     ```
   - [ ] Bot handles error gracefully (returns HOLD with low confidence)
   - Restore valid API key and restart

6. **Monitor for 3 cycles** (3 minutes)
   - [ ] First prediction completes
   - [ ] Second prediction completes (after 60s)
   - [ ] Third prediction completes (after 120s)
   - [ ] All predictions have different reasoning (not cached)

7. **Stop the bot** (Ctrl+C)

### Troubleshooting:

- **Error: "DEEPSEEK_API_KEY is required"** → Check `.env` has uncommented API key
- **Error: "401 Unauthorized"** → API key is invalid, get new one from https://platform.deepseek.com
- **Error: "429 Too Many Requests"** → Rate limit hit, wait 1 minute
- **Timeout error** → DeepSeek API may be slow, wait or try again

---

### Old Test 3: Qwen Vertex AI Strategy (bot-service only)

**Purpose:** Verify GCP Vertex AI integration with official SDK

### Prerequisites:

- [ ] GCP account with billing enabled
- [ ] gcloud CLI installed (`gcloud --version`)
- [ ] Vertex AI API enabled
- [ ] Qwen 480B endpoint deployed in Vertex AI

### Setup (One-time):

1. **Install gcloud CLI** (if not installed)
   ```bash
   brew install --cask google-cloud-sdk
   # Or visit: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Set GCP project**
   ```bash
   gcloud config set project linera-alphabot
   # Or your actual project ID
   ```

4. **Enable Vertex AI API**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

5. **Deploy Vertex AI Endpoint** (via GCP Console)
   - Go to: https://console.cloud.google.com/vertex-ai/model-garden
   - Search: "Qwen 3 Coder 480B"
   - Click **Deploy**
   - Wait for deployment (5-10 minutes)
   - Copy the **Endpoint ID** (e.g., `1234567890`)

### Testing Steps:

1. **Update .env file**
   ```bash
   # Edit .env and uncomment/set:
   STRATEGY=qwen-vertex
   GCP_PROJECT_ID=linera-alphabot
   GCP_REGION=us-central1
   GCP_ENDPOINT=1234567890
   GCP_QWEN_MODEL=qwen/qwen3-coder-480b-a35b-instruct-maas
   ```

2. **Verify Authentication**
   ```bash
   gcloud auth application-default print-access-token
   ```
   - [ ] Should print a long token (starts with `ya29.`)
   - [ ] If error: Run `gcloud auth application-default login`

3. **Run Bot Service**
   ```bash
   pnpm dev
   ```

4. **Expected Output:**
   ```
   [qwen-vertex] Using model: qwen/qwen3-coder-480b-a35b-instruct-maas in project linera-alphabot (us-central1)
   [Orchestrator] Using Qwen 3 Coder 480B via Vertex AI SDK (Atoma-supported)
   [Orchestrator] Starting with 60000ms interval
   [Orchestrator] Cycle 1762721234567 started
   [Orchestrator] Fetching market snapshot...
   [Orchestrator] Current price: $3515.52
   [Orchestrator] Generating prediction...
   [Orchestrator] Signal: BUY @ $3580.25 (confidence: 82.0%)
   [Orchestrator] Reasoning: Strong bullish momentum with volume spike. RSI indicates continued upward pressure. Breaking through key resistance at $3550.
   [Orchestrator] [SKIP] No Linera client configured
   [Orchestrator] Cycle 1762721234567 completed successfully
   ```

5. **Verify Success Criteria:**
   - [ ] Bot starts without errors
   - [ ] Uses official Vertex AI SDK (not raw fetch)
   - [ ] Makes authenticated call to GCP
   - [ ] Generates high-quality prediction
   - [ ] Reasoning is technical and detailed (>100 characters)
   - [ ] Inference takes 3-8 seconds
   - [ ] No authentication errors

6. **Test Error Handling**
   - Stop the bot (Ctrl+C)
   - Edit `.env` and set `GCP_ENDPOINT=invalid-id`
   - Run `pnpm dev`
   - **Expected Error:**
     ```
     [qwen-vertex] Prediction error: Error: Vertex AI endpoint not found
     [Orchestrator] Signal: HOLD @ $3515.52 (confidence: 10.0%)
     ```
   - [ ] Bot handles error gracefully
   - Restore valid endpoint ID and restart

7. **Monitor for 2 cycles** (2 minutes)
   - [ ] First prediction completes
   - [ ] Second prediction completes
   - [ ] Both predictions have detailed, different reasoning

8. **Stop the bot** (Ctrl+C)

### Troubleshooting:

- **Error: "GCP_PROJECT_ID is required"** → Check `.env` has project ID
- **Error: "Application Default Credentials not found"** → Run `gcloud auth application-default login`
- **Error: "Permission denied"** → Ensure your GCP account has Vertex AI permissions
- **Error: "Endpoint not found"** → Check endpoint ID is correct and deployed
- **Error: "Quota exceeded"** → Check GCP billing and quotas

---

### Old Test 4: GPT OSS Vertex AI Strategy (bot-service only)

**Purpose:** Verify GPT OSS 120B model works

### Prerequisites:

- [ ] Same as Test 3 (GCP authentication)
- [ ] GPT OSS 120B endpoint deployed

### Steps:

1. **Deploy GPT OSS Endpoint** (via GCP Console)
   - Go to: https://console.cloud.google.com/vertex-ai/model-garden
   - Search: "GPT OSS 120B"
   - Click **Deploy**
   - Copy the **Endpoint ID**

2. **Update .env file**
   ```bash
   # Edit .env and uncomment/set:
   STRATEGY=gpt-oss-vertex
   GCP_PROJECT_ID=linera-alphabot
   GCP_REGION=us-central1
   GCP_ENDPOINT=9876543210
   GCP_GPT_OSS_MODEL=openai/gpt-oss-120b
   ```

3. **Run Bot Service**
   ```bash
   pnpm dev
   ```

4. **Expected Output:**
   ```
   [gpt-oss-vertex] Using model: openai/gpt-oss-120b in project linera-alphabot (us-central1)
   [Orchestrator] Using GPT OSS 120B via Vertex AI SDK (Atoma-supported)
   [Orchestrator] Signal: SELL @ $3450.00 (confidence: 70.0%)
   [Orchestrator] Reasoning: Market showing signs of exhaustion. Volume declining on uptrend suggests weakening momentum.
   ```

5. **Verify Success Criteria:**
   - [ ] Bot starts without errors
   - [ ] Uses GPT OSS 120B model
   - [ ] Generates quality predictions (may differ from Qwen)
   - [ ] Reasoning is coherent

6. **Stop the bot** (Ctrl+C)

---

### Old Test 5: Linera Integration (bot-service approach)

**Purpose:** Test complete flow: Binance → LLM → Linera Contract

### Prerequisites:

- [ ] Linera validator running locally (or accessible)
- [ ] Bot contract deployed (application ID known)

### Steps:

1. **Start Linera Validator** (separate terminal)
   ```bash
   cd /Users/vywwong/codebase_exp/linera-alphabot
   make linera-local
   # Or: docker compose up
   ```

2. **Verify Linera is Running**
   ```bash
   curl http://localhost:8080/health
   # Should return 200 OK
   ```

3. **Get Application ID and Chain ID**
   - Check your `.env` file for `LINERA_GRAPHQL_URL`
   - Extract chain ID and application ID from URL
   - Example: `http://localhost:8081/chains/bc87caebb95cc08c/applications/cbb593ca83c1327d`
     - Chain ID: `bc87caebb95cc08c`
     - App ID: `cbb593ca83c1327d`

4. **Update .env file**
   ```bash
   # Edit .env and add Linera config:
   STRATEGY=deepseek  # Or qwen-vertex

   # Keep your DeepSeek/GCP credentials
   DEEPSEEK_API_KEY=sk-be853f5bfcc34f39b0706d01407388a4

   # Add Linera configuration
   LINERA_RPC_URL=http://localhost:8080
   LINERA_GRAPHQL_URL=http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>
   ```

5. **Configure Orchestrator with Linera Client**
   - Edit `bot-service/src/main.ts` (if not already configured)
   - Ensure orchestrator is initialized with `lineraConfig`

6. **Run Bot Service**
   ```bash
   pnpm dev
   ```

7. **Expected Output:**
   ```
   [Orchestrator] Using DeepSeek V3 strategy (Atoma-supported)
   [Orchestrator] Cycle 1762721234567 started
   [Orchestrator] Fetching market snapshot...
   [Orchestrator] Current price: $3515.52
   [Orchestrator] Generating prediction...
   [Orchestrator] Signal: BUY @ $3575.50 (confidence: 78.0%)
   [Orchestrator] Reasoning: Strong upward momentum...
   [Orchestrator] Submitting to Linera contract...
   [LineraClient] ✓ Submitted to Linera (hash: abc123...)
   [Orchestrator] Cycle 1762721234567 completed successfully
   ```

8. **Verify Prediction on Linera**
   ```bash
   # Query GraphQL endpoint
   curl -X POST http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID> \
     -H "Content-Type: application/json" \
     -d '{"query": "{ latestSignal { action predictedPriceMicro confidenceBps reasoning } }"}'
   ```

9. **Expected GraphQL Response:**
   ```json
   {
     "data": {
       "latestSignal": {
         "action": "BUY",
         "predictedPriceMicro": "3575500000",
         "confidenceBps": 7800,
         "reasoning": "Strong upward momentum..."
       }
     }
   }
   ```

10. **Verify Success Criteria:**
    - [ ] Bot fetches real market data
    - [ ] LLM generates prediction
    - [ ] Prediction submitted to Linera successfully
    - [ ] Transaction hash returned
    - [ ] GraphQL query shows latest prediction
    - [ ] Price converted correctly (micro-USD → USD)
    - [ ] Confidence converted correctly (bps → decimal)

11. **Monitor Full Cycle** (2 minutes)
    - [ ] First prediction: Fetch → LLM → Linera → Success
    - [ ] Second prediction: New data → New LLM response → New Linera tx
    - [ ] Each cycle takes 5-10 seconds total

12. **Stop the bot** (Ctrl+C)

### Troubleshooting:

- **Error: "Failed to connect to Linera"** → Check validator is running
- **Error: "Application not found"** → Check application ID is correct
- **Error: "GraphQL mutation failed"** → Check contract is deployed correctly
- **Transaction pending forever** → Check Linera validator logs

---

### Old Test 6: Frontend Integration (bot-service approach)

**Purpose:** Verify frontend displays predictions

### Steps:

1. **Start Frontend** (separate terminal)
   ```bash
   cd /Users/vywwong/codebase_exp/linera-alphabot/frontend
   pnpm dev
   ```

2. **Open Browser**
   - Navigate to: http://localhost:3000
   - Or: http://localhost:5173 (depending on setup)

3. **Verify Dashboard:**
   - [ ] Page loads without errors
   - [ ] Shows "AlphaBot Dashboard" header
   - [ ] Displays bot state card
   - [ ] Shows latest prediction
   - [ ] Shows action badge (BUY/SELL/HOLD)
   - [ ] Shows predicted price
   - [ ] Shows confidence percentage
   - [ ] Shows LLM reasoning text
   - [ ] Auto-refreshes every 5 seconds

4. **Test Real-time Updates:**
   - [ ] Wait 60 seconds (bot makes new prediction)
   - [ ] Frontend auto-refreshes
   - [ ] New prediction appears
   - [ ] Reasoning text changes

5. **Test Manual Refresh:**
   - [ ] Click "Refresh" button
   - [ ] Loading state appears briefly
   - [ ] Data updates

6. **Stop frontend** (Ctrl+C)

---

## Old Success Criteria (Deprecated)

### ✅ All Tests Pass If:

- [ ] **Test 1 (SimpleMA):** Bot generates baseline predictions without errors
- [ ] **Test 2 (DeepSeek):** LLM generates detailed reasoning via API
- [ ] **Test 3 (Qwen Vertex):** GCP Vertex AI SDK works with authentication
- [ ] **Test 4 (GPT OSS):** Alternative LLM model works
- [ ] **Test 5 (Linera):** Predictions submitted to blockchain successfully
- [ ] **Test 6 (Frontend):** Dashboard displays predictions in real-time

### Performance Benchmarks:

- **SimpleMA:** <100ms inference
- **DeepSeek:** 2-5s inference
- **Qwen Vertex:** 3-8s inference
- **GPT OSS Vertex:** 3-8s inference
- **Full cycle:** <15s total (fetch + LLM + submit)

### Cost Estimates (Hourly Predictions, 30 days):

- **SimpleMA:** $0 (free)
- **DeepSeek:** $0.70/month (~$0.001 per prediction)
- **Qwen Vertex:** $500-1000/month (contact GCP for pricing)
- **GPT OSS Vertex:** $200-400/month (contact GCP for pricing)

---

## Old Troubleshooting (Deprecated)

### Issue: "Cannot find module"
**Fix:** Run `pnpm install` in bot-service directory

### Issue: "STRATEGY is not defined"
**Fix:** Check `.env` file exists and has `STRATEGY=<value>`

### Issue: "Failed to fetch market data"
**Fix:** Check internet connection and Binance API status

### Issue: "API key invalid"
**Fix:** Get new API key from provider

### Issue: "GCP authentication failed"
**Fix:** Run `gcloud auth application-default login`

### Issue: "Linera connection refused"
**Fix:** Start Linera validator with `make linera-local`

### Issue: "Rate limit exceeded"
**Fix:** Wait 1 minute or increase quota

### Issue: "Out of memory"
**Fix:** Restart services or increase Node.js memory limit

---

## 🎯 START HERE INSTEAD

**Use the correct guide:** `/Users/vywwong/codebase_exp/linera-alphabot/E2E_TESTING.md`

**Section to follow:** "E2E Testing with external-service-mirror"

This tests the **real production flow**:
- service.rs makes HTTP requests
- external-service-mirror proxies to external APIs
- Predictions stored directly on blockchain
- Proves decentralized architecture works

---

## Support

**For the NEW flow:**
- Guide: `/Users/vywwong/codebase_exp/linera-alphabot/E2E_TESTING.md`
- Architecture: `PROGRESS_SUMMARIES/EXTERNAL_SERVICE_MIRROR.md`
- Troubleshooting: See E2E_TESTING.md "Troubleshooting" section

**Documentation:**
- Linera: https://linera.io/docs
- inference.net: https://docs.inference.net
- Binance API: https://binance-docs.github.io/apidocs/spot/en/

---

**⚠️ IMPORTANT:** Do NOT follow the tests in this file. Use `/E2E_TESTING.md` instead! 🚀
