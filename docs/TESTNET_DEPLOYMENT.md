# Testnet Deployment Guide

## Overview

This guide covers deploying AlphaBot to Linera testnet for public testing and demonstration.

**Key Differences from Localnet:**
- Public network (validators run by Linera team)
- Real gas costs (though testnet tokens are free)
- Persistent data (survives restarts)
- HTTP authorization restrictions (requires careful genesis config)
- Public accessibility (anyone can view your bots)

## Prerequisites

### 1. Linera CLI Installation
```bash
cargo install linera --locked
linera --version  # Should show latest version
```

### 2. Testnet Wallet Setup
```bash
# Initialize wallet for testnet
linera wallet init --with-new-chain --faucet https://faucet.testnet-archimedes.linera.net

# Check wallet
linera wallet show
```

**Save your wallet files:**
- `~/.config/linera/wallet.json` - Chain and account info
- `~/.config/linera/wallet.db` - Local state database

### 3. Request Testnet Tokens
```bash
# The faucet automatically gives you tokens when creating a wallet
# Check balance:
linera query-balance
```

## Deployment Architecture on Testnet

```
┌─────────────────────────────────────────────────┐
│ Linera Testnet                                  │
│ - Validators run by Linera team                │
│ - Public GraphQL endpoints                     │
│ - Your deployed bot contracts                  │
└─────────────────────────────────────────────────┘
                    ↕ GraphQL
┌─────────────────────────────────────────────────┐
│ Your VPS/Cloud Server                           │
│ ├─ Scheduler (cron service)                    │
│ ├─ External Service Mirror (port 3002)         │
│ └─ Frontend (optional - can deploy to Vercel)  │
└─────────────────────────────────────────────────┘
```

## Critical Issue: HTTP Authorization

**Problem:** Testnet genesis config may not allow HTTP requests to external domains or localhost.

**Solutions:**

### Option A: Wait for Linera Team to Add HTTP Authorization
Contact Linera team to add `api.binance.com` and `api.inference.net` to genesis config.

### Option B: Run Validator Node (Advanced)
Run your own validator with custom genesis config allowing HTTP.

### Option C: Hybrid Architecture (Recommended for Now)
Use external bot service to call APIs and submit predictions via operations:

```
Bot Service (off-chain) → Fetch Data → Call LLM → Submit Operation
                                                        ↓
                                                  Linera Contract
```

This is less decentralized but works without HTTP authorization.

## Step-by-Step Deployment

### Step 1: Build Contract
```bash
cd /Users/vywwong/codebase_exp/linera-alphabot/contracts

# Build for release
cargo build --release --target wasm32-unknown-unknown

# Verify build
ls target/wasm32-unknown-unknown/release/*.wasm
```

### Step 2: Deploy Contract to Testnet
```bash
# Make sure you're using testnet wallet (not localnet)
linera wallet show  # Should show testnet faucet address

# Deploy contract
linera project publish-and-create bot-state --json-argument '"alphabot-testnet-v1"'
```

**Save the output:**
- Application ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Chain ID: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### Step 3: Find GraphQL Endpoint

**Option A: Use Public Endpoint (if available)**
```
https://graphql.testnet-archimedes.linera.net/chains/{CHAIN_ID}/applications/{APP_ID}
```

**Option B: Run Your Own `linera service`**
```bash
# Start GraphQL service for your chain
linera service --port 8081

# GraphQL endpoint will be:
# http://YOUR_SERVER_IP:8081/chains/{CHAIN_ID}/applications/{APP_ID}
```

### Step 4: Deploy External Service Mirror

**On your VPS:**

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/linera-alphabot.git
cd linera-alphabot/external-service-mirror

# Install dependencies
pnpm install

# Create .env file
cat > .env << 'EOF'
PORT=3002
NODE_ENV=production
BINANCE_API_URL=https://api.binance.com
INFERENCE_API_URL=https://api.inference.net
INFERENCE_API_KEY=your_actual_key_here
EOF

# Build
pnpm build

# Run with PM2 (process manager)
npm install -g pm2
pm2 start dist/main.js --name alphabot-mirror
pm2 save
pm2 startup  # Follow instructions to enable auto-restart
```

**Configure firewall:**
```bash
# Allow port 3002 (for localhost access from same server)
# Do NOT expose 3002 to public internet
```

### Step 5: Deploy Scheduler

```bash
cd /Users/vywwong/codebase_exp/linera-alphabot/scheduler

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
LINERA_GRAPHQL_URL=http://localhost:8081
BOT_CHAIN_ID=your_chain_id
BOT_APP_ID=your_app_id
STRATEGY=gemma
INFERENCE_API_KEY=your_key
CRON_SCHEDULE=0 * * * *
EOF

# Install and build
pnpm install
pnpm build

# Run with PM2
pm2 start dist/index.js --name alphabot-scheduler
pm2 save
```

### Step 6: Deploy Frontend (Optional - Vercel)

**Option A: Vercel (Recommended)**
```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Set environment variable
vercel env add NEXT_PUBLIC_LINERA_GRAPHQL_URL production
# Enter: https://graphql.testnet-archimedes.linera.net/chains/{CHAIN_ID}/applications/{APP_ID}

# Deploy
vercel --prod
```

**Option B: Self-Host on VPS**
```bash
cd frontend

# Build
pnpm build

# Run with PM2
pm2 start npm --name alphabot-frontend -- start
pm2 save
```

## Monitoring & Maintenance

### Check Scheduler Logs
```bash
pm2 logs alphabot-scheduler
```

### Check Mirror Logs
```bash
pm2 logs alphabot-mirror
```

### Query Bot State
```bash
# Using GraphQL endpoint
curl https://graphql.testnet-archimedes.linera.net/chains/{CHAIN_ID}/applications/{APP_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ botId latestSignal { timestamp action predictedPriceMicro confidenceBps reasoning } }"
  }'
```

### Check Wallet Balance
```bash
linera query-balance
```

### Request More Tokens
```bash
linera request-chain --faucet https://faucet.testnet-archimedes.linera.net
```

## Cost Estimation

**Testnet (Free):**
- Tokens: Free from faucet
- Gas fees: Denominated in test tokens
- API costs: ~$7-10/month (inference.net)

**Future Mainnet:**
- TBD based on Linera tokenomics
- API costs: Same (~$7-10/month per bot)
- Hosting: $5-20/month (VPS for scheduler + mirror)

## Troubleshooting

### "HTTP request failed: Unauthorized"
**Issue:** Genesis config doesn't allow HTTP to external domains.
**Solution:** Use Option C (hybrid architecture) until Linera adds HTTP authorization.

### "Transaction failed: Insufficient balance"
**Issue:** Out of testnet tokens.
**Solution:** Request more from faucet.

### "Application not found"
**Issue:** GraphQL endpoint not synced or wrong Chain/App ID.
**Solution:** Double-check IDs, try restarting `linera service`.

### Scheduler not triggering predictions
**Check:**
1. Is scheduler running? `pm2 status`
2. Are logs showing errors? `pm2 logs alphabot-scheduler`
3. Is LINERA_GRAPHQL_URL correct?
4. Is external-service-mirror reachable?

### Frontend showing "No predictions"
**Check:**
1. Has scheduler triggered at least once? (wait up to 1 hour)
2. Is NEXT_PUBLIC_LINERA_GRAPHQL_URL correct?
3. Does GraphQL query work via curl?

## Upgrading Contract

```bash
# Build new version
cd contracts
cargo build --release --target wasm32-unknown-unknown

# Publish new bytecode
linera project publish bot-state

# Upgrade existing application (TODO: check Linera docs for upgrade process)
```

## Security Considerations

### API Keys
- Store in `.env` files (never commit)
- Use different keys for prod vs dev
- Rotate keys periodically
- Monitor usage/costs

### Wallet Security
- Backup `~/.config/linera/wallet.json` securely
- Use dedicated wallet for bot operations
- Don't share private keys
- Consider hardware wallet for mainnet

### Server Security
- Use firewall (ufw/iptables)
- Keep packages updated
- Use SSH keys (disable password auth)
- Monitor resource usage
- Enable fail2ban

## Multi-Bot Deployment

To run multiple bots on testnet:

**1. Deploy multiple contracts:**
```bash
linera project publish-and-create bot-state --json-argument '"alphabot-gemma"'
linera project publish-and-create bot-state --json-argument '"alphabot-deepseek"'
```

**2. Update scheduler config:**
```typescript
// scheduler/.env
BOTS='[
  {"name":"gemma","chainId":"...","appId":"...","strategy":"gemma"},
  {"name":"deepseek","chainId":"...","appId":"...","strategy":"deepseek"}
]'
```

**3. Each bot runs on separate personal chain**
- Independent track records
- Parallel execution
- Easy to add/remove

## Next Steps

1. ✅ Deploy single bot to testnet
2. ⏳ Test with real users
3. ⏳ Deploy multiple strategies
4. ⏳ Gather feedback and metrics
5. ⏳ Prepare for mainnet launch

## Resources

- [Linera Testnet Documentation](https://docs.linera.io/)
- [Testnet Faucet](https://faucet.testnet-archimedes.linera.net)
- [Linera Discord](https://discord.gg/linera) - For support
- [AlphaBot Architecture](./architecture.md)

## Contact

If you encounter issues deploying to testnet:
1. Check Linera Discord #testnet channel
2. Review deployment logs carefully
3. Ensure all prerequisites are met
4. Consider running localnet first to validate setup
