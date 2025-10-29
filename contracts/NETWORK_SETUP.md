# Linera Network Setup Guide

**Quick Reference for Local Development**

---

## ✅ Recommended Approach: `linera net up`

We use the **modern** `linera net up --with-faucet` command for local testing.

### Why This Approach?

| Feature | `linera local start` (old) | `linera net up` (recommended) |
|---------|---------------------------|-------------------------------|
| **Setup Complexity** | Manual chain creation | Automatic admin + faucet chains |
| **Wallet Configuration** | Manual | Auto-configured via env file |
| **Faucet Service** | ❌ None | ✅ Built-in on port 8080 |
| **Multi-Validator** | ❌ Single only | ✅ Configurable (1-10) |
| **Environment File** | ❌ Manual setup | ✅ Auto-generated `env` file |
| **Production-Like** | ⚠️ Basic | ✅ Full network simulation |
| **GraphQL Endpoints** | Manual | Auto-configured |

**Decision:** `linera net up` is the official, recommended approach for Linera SDK 0.15+

---

## Quick Start (Official Workflow)

### 1. Start Network

```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred
make linera-local
```

This runs in **background**:
```bash
linera net up --with-faucet --faucet-port 8080
```

**Network logs:** `infra/localnet/network.log`

---

### 2. Initialize Wallet

**CRITICAL STEP** - Create wallet using the faucet:

```bash
# Option A: Manual
linera wallet init --faucet http://localhost:8080
linera wallet request-chain --faucet http://localhost:8080

# Option B: Use helper
make wallet-init
```

**Verify:**
```bash
linera wallet show
# Should display at least 1 chain with balance
```

**⚠️ Important:** Wallet is valid for network lifetime only. If you restart the network, you MUST remove and recreate the wallet.

---

### 3. Verify Network is Running

```bash
# Check faucet service
curl http://localhost:8080/chains

# Check wallet has chains
linera wallet show

# Check processes
ps aux | grep linera
```

Expected processes:
- `linera-proxy` - GraphQL proxy
- `linera-server` - Validator service
- `linera service` - Faucet service

---

## What Gets Created

When you run `make linera-local`, Linera creates:

```
infra/localnet/
├── env                    # Environment variables (SOURCE THIS!)
├── wallet.json            # Wallet with 3 chains
├── client.db/             # RocksDB storage for chains
├── server_0.db/           # Validator database
├── genesis.json           # Network genesis config
└── validator_*.toml       # Validator configuration files
```

---

## The 3 Initial Chains

| Chain | Purpose | Balance |
|-------|---------|---------|
| **Chain 1** (default) | Admin operations | 1,000,000 tokens |
| **Chain 2** | Faucet service | 1,000,000 tokens |
| **Chain 3** | Testing/development | 1,000,000 tokens |

**Why 3 chains?**
- Admin chain = Deploy applications, manage network
- Faucet chain = Create new chains for testing
- Extra chain = Your bot microchains, experiments

---

## Using the Faucet

The faucet allows you to create new chains programmatically:

```bash
# Create a new chain via faucet
curl -X POST http://localhost:8080/new_chain

# Response:
{
  "chain_id": "e476...",
  "message_id": "abcd...",
  "certificate_hash": "1234..."
}
```

**Use case:** Each bot gets its own chain - use faucet to create 5 chains for 5 bots.

---

## Deployment Workflow

### Step-by-Step

1. **Start network:**
   ```bash
   make linera-local
   ```

2. **Initialize wallet:**
   ```bash
   make wallet-init
   # Or manually:
   # linera wallet init --faucet http://localhost:8080
   # linera wallet request-chain --faucet http://localhost:8080
   ```

3. **Verify setup:**
   ```bash
   linera wallet show
   ```

4. **Build WASM:**
   ```bash
   cd contracts/bot-state
   cargo build --release --target wasm32-unknown-unknown
   ```

5. **Publish bytecode:**
   ```bash
   linera project publish-and-create bot-state
   ```

6. **Query via GraphQL:**
   ```bash
   curl -X POST http://localhost:8080/<CHAIN_ID> \
     -H "Content-Type: application/json" \
     -d '{"query": "{ botId }"}'
   ```

---

## Command Reference

### Network Management

```bash
# Start network (in background)
make linera-local

# Initialize wallet
make wallet-init

# Stop network
make stop-local

# Clean wallet (required before restart)
make wallet-clean

# Full restart workflow
make stop-local
make wallet-clean
make linera-local
make wallet-init
```

### Wallet Operations

```bash
# Initialize wallet with faucet
linera wallet init --faucet http://localhost:8080

# Request chain from faucet
linera wallet request-chain --faucet http://localhost:8080

# Show all chains
linera wallet show

# Set default chain
linera wallet set-default <CHAIN_ID>

# Get chain balance
linera query-balance
```

### Application Management

```bash
# List deployed applications
linera project list-applications

# Publish and create in one command
linera project publish-and-create <APP_NAME>

# Create from existing bytecode
linera project create-application \
  --bytecode-id <BYTECODE_ID> \
  --instantiation-argument "argument"
```

---

## Wallet Storage Location

The `linera wallet init` command creates:

```
~/.config/linera/wallet.json       # Wallet configuration
~/.local/share/linera/             # Chain data storage
```

**Default Paths:**
- Wallet: `~/.config/linera/wallet.json`
- Storage: `~/.local/share/linera/`

**No Environment Variables Needed:**
- The `linera` CLI automatically finds wallet in default location
- Override with `--wallet-path` if needed:
  ```bash
  linera --wallet-path /custom/path/wallet.json wallet show
  ```

---

## Troubleshooting

### Network Won't Start

```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill conflicting process
kill -9 <PID>

# Or change faucet port in Makefile
```

### Wallet Not Found

```bash
# Initialize wallet with faucet
linera wallet init --faucet http://localhost:8080
linera wallet request-chain --faucet http://localhost:8080

# Or use the helper
make wallet-init

# Verify wallet exists
ls -la ~/.config/linera/wallet.json
```

### Applications Not Showing

```bash
# Make sure you're on the right chain
linera wallet show

# Set default chain if needed
linera wallet set-default <CHAIN_ID>

# List apps on current chain
linera project list-applications
```

### Clean Slate

```bash
# Nuclear option: delete everything and restart
make stop-local        # Stop network
make wallet-clean      # Remove wallet
make clean             # Clean build artifacts
make linera-local      # Start network
make wallet-init       # Create new wallet
```

---

## Comparison: Old vs New

### Old Approach (Deprecated)
```bash
# Start validator manually
linera local start --storage-path infra/localnet --force &

# Create wallet manually
linera wallet init --with-new-chain

# No faucet - create chains manually
linera open-chain --from <CHAIN_ID>
```

### New Approach (Official - Recommended)
```bash
# Start network with faucet (runs in background)
make linera-local

# Initialize wallet using faucet
make wallet-init

# Ready to deploy!
```

**Key Difference:**
- Old: Manual chain creation, no faucet
- New: Automated faucet service creates chains on demand

---

## Advanced: Multi-Validator Setup

For production-like testing with multiple validators:

```bash
linera net up \
  --path infra/localnet \
  --with-faucet \
  --faucet-port 8080 \
  --validators 4 \           # 4 validators for BFT consensus
  --shards 2 \               # 2 shards per validator
  --other-initial-chains 5   # 5 extra chains
```

**Use case:** Test consensus behavior, chain synchronization, Byzantine fault tolerance.

---

## Production Deployment (Future)

When deploying to real Linera network:

1. **Don't use** `linera net up` (local only)
2. **Do use** configured validators with `linera-server`
3. **Connect to** external RPC endpoints
4. **Set** `LINERA_WALLET` to persistent location
5. **Use** `--storage=rocksdb:/secure/path` in production

---

## Quick Checklist

Before deploying contracts:

- [ ] `make linera-local` succeeded (network started in background)
- [ ] `make wallet-init` succeeded (wallet created via faucet)
- [ ] `linera wallet show` displays at least 1 chain
- [ ] `curl http://localhost:8080` returns response (faucet running)
- [ ] `ls ~/.config/linera/wallet.json` shows wallet file exists
- [ ] No errors in `infra/localnet/network.log`

---

## Resources

- **Linera Docs:** https://docs.linera.io/
- **CLI Reference:** `linera --help`
- **Network Commands:** `linera net --help`
- **Project Commands:** `linera project --help`

---

**Summary:** Use `linera net up --with-faucet` via `make linera-local`, always `source infra/localnet/env`, and you're ready to deploy!
