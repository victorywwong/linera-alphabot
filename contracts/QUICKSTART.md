# Quick Start Guide

**Updated to follow Official Linera Documentation**

---

## TL;DR - Just Get Started

```bash
# 1. Start network
make linera-local

# 2. Create wallet
make wallet-init

# 3. Verify
linera wallet show

# 4. Ready to deploy!
```

---

## The Official Workflow (3 Steps)

Following the [official Linera documentation](https://docs.linera.io/), here's how to set up your local development environment:

### Step 1: Start the Network

```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred
make linera-local
```

**What happens:**
- Network starts in **background** (you keep your terminal)
- Faucet service runs on port 8080
- Logs written to `infra/localnet/network.log`

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

### Step 2: Initialize Wallet

```bash
make wallet-init
```

**What happens:**
- Creates wallet at `~/.config/linera/wallet.json`
- Requests chain from faucet
- Gives you tokens to deploy contracts

**Manual alternative:**
```bash
linera wallet init --faucet http://localhost:8080
linera wallet request-chain --faucet http://localhost:8080
```

---

### Step 3: Verify Setup

```bash
linera wallet show
```

**Expected output:**
```
╭──────────────────────────────────────────────────────────────────────╮
│ Chain Id            │ Balance                                         │
├─────────────────────┼─────────────────────────────────────────────────┤
│ e476...01 (default) │ 1000.                                           │
╰──────────────────────────────────────────────────────────────────────╯
```

✅ **You're ready to deploy contracts!**

---

## Deploy Your First Contract

```bash
# Build WASM binaries
cd contracts/bot-state
cargo build --release --target wasm32-unknown-unknown

# Publish and create application
linera project publish-and-create bot-state

# You'll get back an Application ID and Chain ID
# Use these to query the GraphQL endpoint
```

---

## Common Commands

### Network Management
```bash
make linera-local    # Start network
make stop-local      # Stop network
make wallet-clean    # Remove wallet
```

### Wallet Operations
```bash
linera wallet show                     # Show chains and balances
linera wallet request-chain            # Request new chain
linera wallet set-default <CHAIN_ID>   # Set default chain
```

### Application Management
```bash
linera project list-applications                    # List deployed apps
linera project publish-and-create <APP_NAME>        # Deploy app
```

---

## Important: Network Restart

⚠️ **Wallet is valid for network lifetime only!**

When you restart the network, you MUST recreate the wallet:

```bash
# Full restart procedure
make stop-local      # Stop network
make wallet-clean    # Remove old wallet (REQUIRED!)
make linera-local    # Start network
make wallet-init     # Create new wallet
```

**Why?**
- Each network instance generates new chain IDs
- Old wallet references invalid chains
- Faucet creates fresh chains each time

---

## Troubleshooting

### "No wallet configured"
```bash
make wallet-init
```

### "Faucet connection refused"
```bash
# Check network is running
ps aux | grep linera

# Restart if needed
make stop-local
make linera-local
make wallet-init
```

### "Port 8080 already in use"
```bash
# Find what's using it
lsof -i :8080

# Kill it
make stop-local
```

### "Application not found"
```bash
# Make sure you're on the right chain
linera wallet show
linera wallet set-default <CHAIN_ID>
```

---

## What Gets Created

### Network Files
```
infra/localnet/
└── network.log         # Network logs
```

### Wallet Files
```
~/.config/linera/
└── wallet.json         # Your wallet configuration

~/.local/share/linera/  # Chain data storage
```

---

## Testing Your Contract

Follow the complete testing guide in [TEST.md](./TEST.md):

1. **Phase 1:** Unit tests (already passing ✅)
2. **Phase 2:** Build WASM binaries
3. **Phase 3:** Deploy to local network (use this guide!)
4. **Phase 4:** Test GraphQL queries
5. **Phase 5:** Test mutations
6. **Phase 6:** Edge case testing
7. **Phase 7:** Integration testing

---

## Helpful Make Targets

```bash
make help            # Show all available commands
make setup           # Install Rust, pnpm, linera-cli
make lint            # Run all linters
make test            # Run all tests
make check           # Run lint + test
make clean           # Remove build artifacts
```

---

## Resources

- **Full Testing Guide:** [TEST.md](./TEST.md)
- **Network Setup Details:** [NETWORK_SETUP.md](./NETWORK_SETUP.md)
- **Contract Explanation:** [README.md](./README.md)
- **Linera Docs:** https://docs.linera.io/
- **Project PRD:** [../PRD.md](../PRD.md)

---

## Next Steps

Once your local network is running:

1. ✅ Deploy `bot-state` contract (see TEST.md Phase 3)
2. ✅ Test GraphQL queries (see TEST.md Phase 4)
3. ✅ Test mutations (see TEST.md Phase 5)
4. 🔄 Build MCP server for market data
5. 🔄 Build frontend dashboard
6. 🔄 Integrate all 3 layers

---

**Summary:** `make linera-local` → `make wallet-init` → `linera wallet show` → Deploy! 🚀
