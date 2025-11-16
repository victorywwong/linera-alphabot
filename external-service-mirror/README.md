# External Service Mirror

**Localhost HTTP proxy for Linera service.rs HTTP requests**

## Purpose

This service acts as a localhost proxy that mirrors external API requests from the Linera `service.rs` (WASM) layer. It exists to work around Linera's HTTP authorization restrictions while we prove the full stack architecture.

### The Problem

Linera's HTTP request policy is configured at the **committee/genesis level**, not per-application. When using `linera net up` for local development:
- HTTP allow list defaults to `null` (all requests blocked)
- `linera net up` doesn't expose `--http-request-allow-list` parameter
- Modifying policy requires admin chain ownership
- Result: service.rs HTTP requests to external APIs (Binance, inference.net) are blocked

See: `PROGRESS_SUMMARIES/HTTP_AUTH_ISSUE.md` for full details.

### The Solution

```
service.rs → http://localhost:3002 → external-service-mirror → External APIs
                                                              ├→ api.binance.com (market data)
                                                              └→ api.inference.net (LLM inference)
```

Since "localhost" is typically in the HTTP allow list by default, service.rs can call `localhost:3002`, and this service proxies those requests to the real external APIs.

## Architecture

### Proxied Endpoints

#### Binance Market Data
- `GET /binance/ticker?symbol=ETHUSDT`
  → Proxies to `https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT`

- `GET /binance/klines?symbol=ETHUSDT&interval=1h&limit=200`
  → Proxies to `https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=200`

#### inference.net LLM Inference
- `POST /inference/chat/completions`
  → Proxies to `https://api.inference.net/v1/chat/completions`
  → Transparently forwards `Authorization` header from service.rs to inference.net
  → Falls back to `INFERENCE_API_KEY` env var if no header provided (for direct testing)

### service.rs Integration

The contract's `service.rs` makes HTTP requests to localhost and passes the API key:

```rust
// Instead of direct external API calls:
// http::Request::post("https://api.inference.net/v1/chat/completions", body)
//   .with_header("Authorization", format!("Bearer {}", api_key).as_bytes())

// service.rs uses localhost proxy (transparently forwards Authorization header):
http::Request::post("http://localhost:3002/inference/chat/completions", body)
  .with_header("Content-Type", b"application/json")
  .with_header("Authorization", format!("Bearer {}", api_key).as_bytes())
```

**Important:** The proxy is **transparent** - it forwards the Authorization header from service.rs to inference.net. This means:
- ✅ service.rs manages the API key (as it should)
- ✅ When HTTP auth is fixed in Wave 3, just change URLs back to direct API calls
- ✅ No secret management at the proxy layer

## Setup

### 1. Install Dependencies
```bash
cd external-service-mirror
pnpm install
```

### 2. Configure Environment (Optional for Testing)
```bash
cp .env.example .env
# Edit .env and add your INFERENCE_API_KEY from https://inference.net/dashboard
# NOTE: This is OPTIONAL - only needed for direct curl testing
# In normal operation, service.rs passes the API key via Authorization header
```

### 3. Start the Service
```bash
pnpm dev          # Development mode with hot reload
# OR
pnpm build && pnpm start    # Production mode
```

The service will start on port 3002 (configurable via `PORT` env var).

## Usage

### From Makefile (Recommended)
```bash
make mirror        # Start external-service-mirror
make stop-mirror   # Stop external-service-mirror
```

### Testing Directly
```bash
# Test Binance ticker proxy
curl "http://localhost:3002/binance/ticker?symbol=ETHUSDT"

# Test Binance klines proxy
curl "http://localhost:3002/binance/klines?symbol=ETHUSDT&interval=1h&limit=200"

# Test inference.net proxy (requires API key in .env)
curl -X POST "http://localhost:3002/inference/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-3-27b-instruct/bf-16",
    "messages": [
      {"role": "user", "content": "Say hello"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

### From service.rs
Once the contract is deployed with updated URLs, the GraphQL mutation will work:

```graphql
mutation {
  executePrediction(strategy: "gemma") {
    timestamp
    action
    predictedPriceMicro
    confidenceBps
    reasoning
  }
}
```

## Development

### File Structure
```
external-service-mirror/
├── src/
│   ├── main.ts               # Entry point
│   ├── server.ts             # Express app setup
│   ├── routes/
│   │   ├── binance.ts        # Binance proxy routes
│   │   └── inference.ts      # inference.net proxy routes
│   ├── clients/
│   │   ├── binance.ts        # Binance HTTP client
│   │   └── inference.ts      # inference.net HTTP client
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

### Adding New External Services

To proxy a new external API:

1. Create new client in `src/clients/`
2. Create new route in `src/routes/`
3. Register route in `src/server.ts`
4. Update service.rs to call `localhost:3002/your-new-endpoint`

## Benefits

- ✅ **Unblocks Wave 2 Development:** Proves full stack without waiting for Linera HTTP auth fix
- ✅ **Minimal Code Changes:** service.rs just swaps base URLs
- ✅ **Reuses Infrastructure:** Leverages bot-service's proven fetcher patterns
- ✅ **Easy Testing:** Can test proxy independently with curl
- ✅ **Future-Proof:** When Linera HTTP auth is fixed (Wave 3), just remove proxy and revert URLs

## Future Work (Wave 3+)

This proxy is a **temporary workaround**. In Wave 3, we plan to:

1. Configure Linera network with proper genesis-level HTTP allow list
2. Remove external-service-mirror dependency
3. Update service.rs to call external APIs directly
4. Archive this service as a reference implementation

See: `PROGRESS_SUMMARIES/HTTP_AUTHORIZATION_SETUP.md` for the long-term solution.

## Related Documentation

- `PROGRESS_SUMMARIES/HTTP_AUTH_ISSUE.md` - Why this proxy exists
- `PROGRESS_SUMMARIES/HTTP_AUTHORIZATION_SETUP.md` - Attempted HTTP auth configuration
- `PROGRESS_SUMMARIES/EXTERNAL_SERVICE_MIRROR.md` - Architecture details
- `contracts/bot-state/src/service.rs` - Contract service layer that calls this proxy

## Troubleshooting

### "Connection refused" errors
- Check that external-service-mirror is running: `pnpm dev` or `make mirror`
- Verify port 3002 is not in use: `lsof -i :3002`

### "Unauthorized" from inference.net
- Check that `INFERENCE_API_KEY` is set in `.env`
- Verify API key is valid at https://inference.net/dashboard

### "Rate limit exceeded" from Binance
- Binance public API has rate limits (1200 requests/minute, weight-based)
- Consider adding caching layer if hitting limits

## License

MIT
