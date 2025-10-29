# How to Know: Local vs Testnet

**Quick answer:** Run `make check-network`

---

## 🔍 Quick Check

```bash
make check-network
```

This will show you exactly which network you're using!

---

## 📊 What It Shows

### If You're on LOCAL Network ✅
```
🌐 Network Type: LOCAL DEVELOPMENT
   Faucet: http://localhost:8080
   GraphQL: http://localhost:8080/chains/<CHAIN_ID>

💡 Quick Commands:
   You're using LOCAL network ✅
   - Deploy: linera project publish-and-create <app>
   - Switch to testnet: unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE
```

### If You're on TESTNET
```
🌐 Network Type: TESTNET (or other)
   Check your network configuration

💡 Quick Commands:
   You're using DEFAULT wallet (likely TESTNET)
   - Switch to local: source infra/localnet/env.sh
   - Or use: make wallet-show
```

---

## 🔑 Visual Indicators

| Indicator | LOCAL Network | TESTNET |
|-----------|--------------|---------|
| **Wallet Location** | `infra/localnet/wallet.json` | `~/Library/Application Support/linera/` |
| **Environment Vars** | Set (LINERA_WALLET, etc.) | Not set (uses defaults) |
| **Faucet** | `http://localhost:8080` | External URL |
| **Chain Count** | Usually 2 (fresh start) | Varies |

---

## 🎯 Quick Commands

### Check Current Network
```bash
make check-network
```

### Switch to LOCAL
```bash
source infra/localnet/env.sh
linera wallet show
```

### Switch to TESTNET
```bash
unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE
linera wallet show
```

---

## 📁 File Locations

### LOCAL Network Files
```
infra/localnet/
├── wallet.json          ← Local wallet
├── keystore.json        ← Local keys
├── wallet.db/           ← Local chain data
├── network.log          ← Network logs
└── env.sh              ← Helper script
```

### TESTNET Files (Default)
```
~/Library/Application Support/linera/
├── wallet.json          ← Testnet wallet
├── keystore.json        ← Testnet keys
└── client.db/           ← Testnet chain data
```

---

## 💡 Manual Checks

### Check Environment Variables
```bash
echo $LINERA_WALLET
```

**If output is:**
- Empty → Using TESTNET (default wallet)
- `/Users/.../infra/localnet/wallet.json` → Using LOCAL ✅
- Other path → Custom wallet

### Check Wallet Content
```bash
linera wallet show
```

Look at the chain IDs:
- **LOCAL:** Fresh chains, recent timestamps
- **TESTNET:** Older chains, external addresses

### Check Which Faucet
```bash
# Try local faucet
curl http://localhost:8080
```

**If it responds:** Local network is running ✅
**If connection refused:** Local network not started

---

## 🚀 Common Workflows

### Working on LOCAL (This Project)
```bash
# Make sure you're on local
source infra/localnet/env.sh

# Verify
make check-network
# Should show: LOCAL DEVELOPMENT ✅

# Deploy
cd contracts/bot-state
linera project publish-and-create bot-state
```

### Working on TESTNET (Other Projects)
```bash
# Clear local env
unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE

# Verify
make check-network
# Should show: TESTNET

# Use testnet
linera wallet show  # Shows testnet chains
```

---

## ⚠️ Common Mistakes

### Mistake 1: Mixing Networks
```bash
# You're on local network but try to use testnet chains
source infra/localnet/env.sh
linera <command>  # Uses LOCAL chains, not testnet!
```

**Fix:** Always check with `make check-network` first

### Mistake 2: Wrong Wallet
```bash
# Testnet wallet in local network
linera project publish-and-create bot-state
# Error: chains not found!
```

**Fix:** Switch to local wallet: `source infra/localnet/env.sh`

### Mistake 3: Forgot to Source
```bash
# You think you're on local, but...
linera wallet show  # Shows TESTNET wallet!
```

**Fix:** `source infra/localnet/env.sh` in each new terminal

---

## 🎯 Pro Tips

### Tip 1: Check Before Every Deploy
```bash
make check-network  # Always check first!
cd contracts/bot-state
linera project publish-and-create bot-state
```

### Tip 2: Use Make Commands (Auto-Configured)
```bash
make wallet-show    # Always uses LOCAL wallet
```

### Tip 3: Add to Your Shell Prompt
Add to `.bashrc` or `.zshrc`:
```bash
function linera_network() {
    if [ -n "$LINERA_WALLET" ]; then
        if [[ "$LINERA_WALLET" == *"infra/localnet"* ]]; then
            echo "🔧 LOCAL"
        else
            echo "🌐 CUSTOM"
        fi
    else
        echo "🌍 TESTNET"
    fi
}

# In your PS1:
PS1="[\$(linera_network)] $PS1"
```

Result: Your prompt shows which network you're on!
```
[🔧 LOCAL] ~/linera-eth-pred $
[🌍 TESTNET] ~/linera-eth-pred $
```

---

## 📝 Summary

**Easiest way:**
```bash
make check-network
```

**Quick manual check:**
```bash
echo $LINERA_WALLET
```
- Empty = TESTNET
- `infra/localnet/wallet.json` = LOCAL

**Switch networks:**
```bash
# To LOCAL
source infra/localnet/env.sh

# To TESTNET
unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE
```

---

## 🆘 Still Confused?

Run this debug script:
```bash
bash infra/localnet/check-network.sh
```

It will tell you:
- ✅ Which wallet you're using
- ✅ Which network you're on
- ✅ How to switch networks
- ✅ Available commands

---

**Remember:** When in doubt, `make check-network`! 🎯
