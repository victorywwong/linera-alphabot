# AlphaBot Strategy Guide

This guide explains how to use different trading strategies with AlphaBot.

## Available Strategies

### 1. Qwen 3 Coder 480B via GCP (Recommended for Wave 2)
- **Type**: LLM-powered
- **Model**: Qwen 3 Coder 480B (Atoma-supported - EXACT model)
- **Wave**: 2
- **Cost**: TBD (contact GCP sales)
- **Migration**: Direct path to Atoma in Wave 3 (same model!)

**Setup:**
```bash
# 1. Install and authenticate gcloud CLI
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Set environment variables
export STRATEGY=qwen-gcp
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1
export GCP_ENDPOINT=your-vertex-ai-endpoint
export GCP_MODEL=qwen/qwen3-coder-480b-a35b-instruct-maas

# 3. Start bot-service
pnpm dev
```

**Example output:**
```
[QwenGCPStrategy] Using model: qwen/qwen3-coder-480b-a35b-instruct-maas in project alphabot-prod (us-central1)
[Orchestrator] Using Qwen 3 Coder 480B via GCP (Atoma-supported)
[Orchestrator] Signal: BUY @ $3580.25 (confidence: 82.0%)
[Orchestrator] Reasoning: Strong bullish momentum with volume spike. RSI showing strength continuation pattern.
```

### 2. SimpleMA (Baseline - Default)
- **Type**: Deterministic
- **Algorithm**: SMA20/SMA50 crossover
- **Wave**: 1 (production-ready)
- **Cost**: Free
- **No setup required**

```bash
export STRATEGY=simple-ma
pnpm dev
```

### 2. DeepSeek V3 (Recommended for Wave 2)
- **Type**: LLM-powered
- **Model**: DeepSeek V3 0324 (Atoma-supported)
- **Wave**: 2
- **Cost**: ~$0.70/month for hourly predictions
- **Migration**: Direct path to Atoma in Wave 3

**Setup:**
```bash
# 1. Get API key from https://platform.deepseek.com
# 2. Set environment variables
export STRATEGY=deepseek
export DEEPSEEK_API_KEY=sk-your-api-key-here

# 3. Start bot-service
pnpm dev
```

**Example output:**
```
[Orchestrator] Using DeepSeek V3 strategy (Atoma-supported)
[Orchestrator] Signal: BUY @ $3575.50 (confidence: 78.0%)
[Orchestrator] Reasoning: Strong upward momentum with increasing volume and positive price action over last 6 hours. Breaking resistance at $3550.
```

### 3. Qwen (Local Alternative)
- **Type**: LLM-powered
- **Model**: Qwen 2.5 Coder 32B (local via Ollama)
- **Wave**: 2
- **Cost**: Free (local compute)
- **Migration**: Migrate to Qwen 3 Coder 480B on Atoma in Wave 3

**Setup:**
```bash
# 1. Install Ollama
brew install ollama

# 2. Pull Qwen model
ollama pull qwen2.5-coder:32b

# 3. Start Ollama server (in separate terminal)
ollama serve

# 4. Set environment variables
export STRATEGY=qwen
export OLLAMA_BASE_URL=http://localhost:11434  # optional, this is default
export OLLAMA_MODEL=qwen2.5-coder:32b          # optional, this is default

# 5. Start bot-service
pnpm dev
```

**Example output:**
```
[QwenStrategy] Using model: qwen2.5-coder:32b at http://localhost:11434
[Orchestrator] Using Qwen strategy (local Ollama)
[Orchestrator] Signal: SELL @ $3425.00 (confidence: 65.0%)
[Orchestrator] Reasoning: Bearish momentum detected with declining volume.
```

## Strategy Comparison

| Feature | SimpleMA | Qwen GCP | DeepSeek | Qwen Local |
|---------|----------|----------|----------|------------|
| Type | Deterministic | LLM (GCP) | LLM (Cloud) | LLM (Local) |
| Setup | None | gcloud auth | API Key | Ollama Install |
| Cost | Free | TBD | ~$0.70/month | Free (local) |
| Model Size | N/A | 480B | V3 | 32B |
| Inference Speed | <1ms | 3-8s | 2-5s | 5-15s (local GPU) |
| Atoma Support | N/A | ✅ Yes (exact) | ✅ Yes | ✅ Yes (480B variant) |
| Reasoning Quality | Formula-based | Best | Good | Good |
| Production Ready | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Testing only |
| Recommended For | Baseline | **Wave 2 Production** | Budget testing | Local development |

## Environment Variables Reference

### Strategy Selection
```bash
STRATEGY=simple-ma    # Default: deterministic SMA crossover
STRATEGY=qwen-gcp     # Qwen 3 Coder 480B via GCP Vertex AI (RECOMMENDED)
STRATEGY=deepseek     # DeepSeek V3 cloud API
STRATEGY=qwen         # Qwen local via Ollama
```

### Qwen GCP Configuration (RECOMMENDED)
```bash
GCP_PROJECT_ID=your-project-id                              # Required
GCP_REGION=us-central1                                      # Optional
GCP_ENDPOINT=your-vertex-ai-endpoint                        # Required
GCP_MODEL=qwen/qwen3-coder-480b-a35b-instruct-maas         # Optional
```

### DeepSeek Configuration
```bash
DEEPSEEK_API_KEY=sk-...                      # Required
DEEPSEEK_BASE_URL=https://api.deepseek.com   # Optional
DEEPSEEK_MODEL=deepseek-chat                 # Optional (v3 model)
```

### Qwen Ollama Configuration (Local)
```bash
OLLAMA_BASE_URL=http://localhost:11434   # Optional
OLLAMA_MODEL=qwen2.5-coder:32b           # Optional
```

## Migration to Atoma (Wave 3)

When Atoma API access becomes available:

**From Qwen GCP (RECOMMENDED - Same exact model!):**
```bash
# Change just 2 lines:
export STRATEGY=atoma
export ATOMA_API_KEY=your-atoma-key

# Same 480B model, same prompts, same code!
# This is the EASIEST migration path
```

**From DeepSeek:**
```bash
# Change just 2 lines:
export STRATEGY=atoma
export ATOMA_API_KEY=your-atoma-key
export ATOMA_MODEL=deepseek-v3

# Same model, same prompts, same code!
```

**From Qwen Local:**
```bash
# Migrate to larger Qwen variant:
export STRATEGY=atoma
export ATOMA_API_KEY=your-atoma-key
export ATOMA_MODEL=qwen-3-coder-480b

# Upgrade from 32B to 480B - better accuracy expected
```

## Testing Strategies

All strategies share the same interface, making testing easy:

```typescript
import { SimpleMAStrategy } from './strategies/simple-ma';
import { QwenGCPStrategy } from './strategies/llm-qwen-gcp';
import { DeepSeekStrategy } from './strategies/llm-deepseek';
import { QwenStrategy } from './strategies/llm-qwen';

// All implement the same interface
const strategies = [
  new SimpleMAStrategy(),
  new QwenGCPStrategy(),
  new DeepSeekStrategy(),
  new QwenStrategy(),
];

// Test all with same market data
for (const strategy of strategies) {
  const signal = await strategy.predict(marketSnapshot);
  console.log(`${strategy.name}: ${signal.action} @ $${signal.predicted_price}`);
}
```

## Troubleshooting

### DeepSeek Errors

**"DEEPSEEK_API_KEY is required"**
- Solution: Set the API key environment variable

**"DeepSeek API error (401): Unauthorized"**
- Solution: Check your API key is valid at https://platform.deepseek.com

**"DeepSeek API error (429): Rate limit exceeded"**
- Solution: Wait or upgrade to higher tier (unlikely with hourly predictions)

### Qwen Errors

**"ECONNREFUSED"**
- Solution: Start Ollama server: `ollama serve`

**"Model not found"**
- Solution: Pull the model: `ollama pull qwen2.5-coder:32b`

**Slow inference (>30s)**
- Solution: Use GPU acceleration or smaller model variant

### Fallback Behavior

All LLM strategies gracefully degrade to HOLD signals on error:
- Confidence: 0.1 (10%)
- Predicted price: Current market price
- Reasoning: Error message

This ensures the bot never crashes, just becomes conservative when LLM is unavailable.

## Next Steps

1. **Start with SimpleMA** to validate your setup works
2. **Test DeepSeek** for Wave 2 production deployment
3. **Optional: Try Qwen** for free local experimentation
4. **Compare accuracy** on the leaderboard dashboard
5. **Prepare for Atoma migration** in Wave 3

For more details, see:
- `docs/WAVE_2_LLM_INTEGRATION.md` - Complete implementation guide
- `docs/DECENTRALIZED_INFERENCE_ARCHITECTURE.md` - Atoma migration plan
- `.env.example` - Configuration examples
