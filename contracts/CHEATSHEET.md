# Linera Local Testing Cheat Sheet

**Official Workflow - Quick Reference**

---

## 🚀 Setup (One Time)

```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred
```

---

## 📋 Standard Workflow

### 1. Start Network
```bash
make linera-local
```
✅ Network runs in background on port 8080

### 2. Create Wallet
```bash
make wallet-init
```
✅ Wallet created at `~/.config/linera/wallet.json`

### 3. Verify
```bash
linera wallet show
```
✅ Should show at least 1 chain with balance

### 4. Build Contract
```bash
cd contracts/bot-state
cargo build --release --target wasm32-unknown-unknown
```

### 5. Deploy
```bash
linera project publish-and-create bot-state
```
📝 Save the Chain ID!

### 6. Test GraphQL
```bash
CHAIN_ID="<your-chain-id>"
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ botId }"}'
```

---

## 🔄 Network Restart

**CRITICAL: Wallet must be removed before restart!**

```bash
make stop-local      # Stop
make wallet-clean    # Remove wallet (REQUIRED!)
make linera-local    # Start
make wallet-init     # New wallet
```

---

## 🛠️ Common Commands

| Command | Purpose |
|---------|---------|
| `make linera-local` | Start network |
| `make wallet-init` | Create wallet via faucet |
| `make wallet-clean` | Remove wallet |
| `make stop-local` | Stop network |
| `linera wallet show` | Show chains |
| `linera wallet request-chain` | Get new chain |

---

## 🔍 Debugging

### Check Network
```bash
ps aux | grep linera
tail -f infra/localnet/network.log
curl http://localhost:8080
```

### Check Wallet
```bash
ls ~/.config/linera/wallet.json
linera wallet show
```

### Port 8080 In Use
```bash
lsof -i :8080
make stop-local
```

---

## 📍 File Locations

| File | Location |
|------|----------|
| Wallet | `~/.config/linera/wallet.json` |
| Chain data | `~/.local/share/linera/` |
| Network logs | `infra/localnet/network.log` |
| Contract WASM | `contracts/bot-state/target/wasm32-unknown-unknown/release/*.wasm` |

---

## 🧪 GraphQL Examples

### Query
```bash
curl -X POST http://localhost:8080/chains/$CHAIN_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ botId latestSignal { action } followerCount }"}'
```

### Mutation
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
        reasoning: \"Test prediction\"
      )
    }"
  }'
```

---

## ⚠️ Important Notes

- **No `source` commands needed!** (wallet auto-discovered)
- **Wallet lifetime = network lifetime** (recreate on restart)
- **Network runs in background** (use `tail -f` for logs)
- **Faucet on port 8080** (creates chains on demand)

---

## 📖 Full Documentation

| Guide | Purpose |
|-------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | 3-step getting started |
| [TEST.md](./TEST.md) | Complete 8-phase testing |
| [NETWORK_SETUP.md](./NETWORK_SETUP.md) | Network details |
| [README.md](./README.md) | Contract explanation |
| [TEST_SUMMARY.md](./TEST_SUMMARY.md) | Visual workflow |

---

**Print this page for quick reference!**
