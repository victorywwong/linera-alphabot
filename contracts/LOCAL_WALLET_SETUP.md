# Project-Specific Wallet Setup

**Problem Solved:** Your default Linera wallet (from testnet) won't conflict with this local development setup!

---

## ✅ What Changed

**Before:** Wallet created in default location (`~/.config/linera/`)
- Conflicted with existing testnet wallet
- Had to manually manage multiple wallets

**After:** Project-specific wallet in `infra/localnet/`
- Your default wallet remains untouched
- Each project has its own wallet
- Easy to clean up and restart

---

## 🚀 Quick Start

### 1. Start Network
```bash
make linera-local
```

### 2. Initialize Project Wallet
```bash
make wallet-init
```

This creates:
```
infra/localnet/
├── wallet.json      # Wallet configuration
├── keystore.json    # Private keys
├── wallet.db/       # Chain data
└── env.sh          # Environment helper
```

### 3. Option A: Use Make Commands (Easiest)
```bash
make wallet-show    # Show wallet status
```

All subsequent `make` commands automatically use the project wallet.

### 3. Option B: Source Environment (For Direct `linera` Commands)
```bash
source infra/localnet/env.sh
linera wallet show
```

---

## 📋 Make Commands

All these use the **project-specific wallet**:

| Command | Purpose |
|---------|---------|
| `make wallet-init` | Create wallet in `infra/localnet/` |
| `make wallet-show` | Show wallet status |
| `make wallet-clean` | Remove project wallet |
| `make linera-local` | Start network |
| `make stop-local` | Stop network |

---

## 🔧 Using Direct `linera` Commands

If you want to use `linera` commands directly (not through `make`):

### Option 1: Source Environment File (Recommended)
```bash
source infra/localnet/env.sh
```

Then use `linera` normally:
```bash
linera wallet show
linera wallet request-chain --faucet http://localhost:8080
linera project publish-and-create bot-state
```

### Option 2: Set Environment Variables Manually
```bash
export LINERA_WALLET="$PWD/infra/localnet/wallet.json"
export LINERA_KEYSTORE="$PWD/infra/localnet/keystore.json"
export LINERA_STORAGE="rocksdb:$PWD/infra/localnet/wallet.db"
```

### Option 3: Use `--wallet` Flag
```bash
linera --wallet infra/localnet/wallet.json wallet show
```

---

## 🔄 Network Restart Workflow

```bash
# Stop network
make stop-local

# Clean project wallet
make wallet-clean

# Start network again
make linera-local

# Create new project wallet
make wallet-init
```

**Your default testnet wallet is never affected! ✅**

---

## 📁 File Locations

### Project Wallet (This Setup)
```
infra/localnet/
├── wallet.json
├── keystore.json
├── wallet.db/
├── network.log
└── env.sh
```

### Default Wallet (Testnet - Untouched)
```
~/Library/Application Support/linera/
├── wallet.json
├── keystore.json
└── client.db/
```

**They never conflict!**

---

## 🎯 Complete Example

**Terminal 1: Set up local network**
```bash
# Start network
make linera-local

# Create project wallet
make wallet-init

# Verify
make wallet-show
```

**Terminal 2: Deploy contract**
```bash
# Source environment
source infra/localnet/env.sh

# Build
cd contracts/bot-state
cargo build --release --target wasm32-unknown-unknown

# Deploy
linera project publish-and-create bot-state
```

**Terminal 3: Test with your testnet wallet**
```bash
# No env sourcing needed - uses default wallet
linera wallet show  # Shows your testnet chains!
```

---

## 🐛 Troubleshooting

### "Keystore already exists"
You're using the wrong wallet! Either:
```bash
# Option 1: Use make commands
make wallet-show

# Option 2: Source environment
source infra/localnet/env.sh
linera wallet show

# Option 3: Clean and recreate
make wallet-clean
make wallet-init
```

### "No wallet configured"
```bash
# Make sure you initialized the project wallet
make wallet-init

# Then source the environment
source infra/localnet/env.sh
```

### "Wrong network"
```bash
# Check which wallet you're using
echo $LINERA_WALLET

# If empty, source environment
source infra/localnet/env.sh

# Verify it's pointing to project wallet
echo $LINERA_WALLET
# Should show: /path/to/linera-eth-pred/infra/localnet/wallet.json
```

---

## ✨ Benefits

✅ **No Conflicts** - Default wallet stays pristine
✅ **Project Isolation** - Each project has own wallet
✅ **Easy Cleanup** - `make wallet-clean` removes everything
✅ **Clear Separation** - Local dev vs testnet
✅ **Multiple Networks** - Work on multiple projects simultaneously

---

## 🔑 Environment Variables Explained

| Variable | Purpose | Value |
|----------|---------|-------|
| `LINERA_WALLET` | Wallet config | `infra/localnet/wallet.json` |
| `LINERA_KEYSTORE` | Private keys | `infra/localnet/keystore.json` |
| `LINERA_STORAGE` | Chain data | `rocksdb:infra/localnet/wallet.db` |

When these are set, `linera` CLI uses them instead of defaults.

---

## 📚 Related Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [TEST.md](./TEST.md) - Complete testing guide
- [NETWORK_SETUP.md](./NETWORK_SETUP.md) - Network details

---

**Summary:** Use `make` commands or `source infra/localnet/env.sh`, and your default wallet stays safe! 🎉
