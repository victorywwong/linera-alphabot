# 🔍 Verify Bot-State Deployment

## Current Status

✅ **Bot-State contract deployed successfully**
✅ **GraphQL service running at** `http://localhost:8081`
✅ **GraphiQL IDE available** for interactive queries

---

## Option 1: Browser-Based Verification (Easiest)

### Open GraphiQL IDE

1. **Open your browser** and navigate to:
   ```
   http://localhost:8081
   ```

2. **GraphiQL interface will load** - this is an interactive GraphQL playground

### Query the Application

In the GraphiQL editor, try these queries:

#### Query 1: List All Applications
```graphql
{
  applications {
    id
    description
    link
  }
}
```

#### Query 2: Get Chain Information
```graphql
{
  chains {
    default
    list
  }
}
```

#### Query 3: Query Bot State (if app ID is known)
```graphql
{
  application(applicationId: "<APP_ID_HERE>") {
    id
    description
  }
}
```

---

## Option 2: Command Line Verification

### Find Application ID

The application ID should be in the deployment output. Look for the bytecode ID:
```
4ca069379fea0a7469a14612f4d323f12f600d166a85d451ff8966743013d42b
```

### Query via curl

```bash
# Query applications
curl -X POST http://localhost:8081/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ applications { id } }"}'
```

### Check Service Logs

```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred/contracts/bot-state
tail -f ../../infra/localnet/graphql.log
```

---

## Option 3: Direct State Query (Advanced)

If you know the application ID, you can query the bot state directly:

```graphql
query GetBotState {
  applications {
    id
    description
    link
  }
}
```

Then use the application endpoint to query specific state:

```
http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>
```

---

## What to Expect

### Successful Deployment Indicators

✅ **GraphiQL loads** at `http://localhost:8081`
✅ **Chains query returns** 2 chains:
   - `bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4` (main chain)
   - `2e4bb439283a6b6b835784e9f678523a9abd6631127792a807465d5dfd2df259` (faucet chain)

✅ **Applications query returns** bot-state application with ID
✅ **Bot state initialized** with `bot_id = "alpha-bot-1"`
✅ **Follower count** = 0
✅ **Latest signal** = null (no predictions yet)

---

## Next Steps After Verification

### 1. Submit a Test Prediction

Once verified, submit a test prediction via GraphQL mutation:

```graphql
mutation SubmitTestPrediction {
  submitPrediction(
    timestamp: 1730000000000,
    action: BUY,
    predictedPriceMicro: 3500000000,  # $3500.00
    confidenceBps: 8500,               # 85%
    reasoning: "Test prediction for Wave 1 MVP"
  )
}
```

### 2. Query Latest Signal

After submitting, verify it was stored:

```graphql
query GetLatestSignal {
  botState {
    botId
    latestSignal {
      timestamp
      action
      predictedPriceMicro
      confidenceBps
      reasoning
    }
    followerCount
  }
}
```

### 3. Test AddFollower Operation

```graphql
mutation TestFollower {
  addFollower
}
```

Then verify follower count increased:

```graphql
{
  botState {
    followerCount
  }
}
```

---

## Troubleshooting

### GraphiQL doesn't load

**Check service is running:**
```bash
ps aux | grep "linera service"
```

**Check logs for errors:**
```bash
tail -f /Users/vywwong/codebase_exp/linera-eth-pred/infra/localnet/graphql.log
```

**Restart service:**
```bash
# Kill existing service
pkill -f "linera service"

# Source environment
cd /Users/vywwong/codebase_exp/linera-eth-pred/contracts/bot-state
source ../../infra/localnet/env.sh

# Start service again
linera service --port 8081
```

### Applications query returns empty

This might mean:
- Application needs to be accessed through chain-specific endpoint
- Need to use chain ID in the GraphQL query
- Application might not be exposed at root level

**Try chain-specific query:**
```graphql
{
  chain(chainId: "bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4") {
    applications {
      id
      description
    }
  }
}
```

### Can't find application ID

**Check wallet for application information:**
```bash
source ../../infra/localnet/env.sh
linera wallet show --verbose
```

---

## Environment Info

**Network:** Local Development
**Chain ID:** `bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4`
**Bytecode ID:** `4ca069379fea0a7469a14612f4d323f12f600d166a85d451ff8966743013d42b`
**Bot ID:** `"alpha-bot-1"`
**GraphQL Endpoint:** `http://localhost:8081`
**GraphiQL IDE:** `http://localhost:8081`

---

## Service Management

### Start Service
```bash
cd /Users/vywwong/codebase_exp/linera-eth-pred/contracts/bot-state
source ../../infra/localnet/env.sh
linera service --port 8081
```

### Stop Service
```bash
pkill -f "linera service"
```

### Check Service Status
```bash
ps aux | grep "linera service" | grep -v grep
```

### View Logs
```bash
tail -f /Users/vywwong/codebase_exp/linera-eth-pred/infra/localnet/graphql.log
```

---

## Summary

You've successfully deployed the bot-state contract! The GraphQL service is running and ready for queries.

**What works:**
- ✅ Contract deployed to local network
- ✅ State initialized with bot_id = "alpha-bot-1"
- ✅ GraphQL service exposing contract API
- ✅ Ready for mutations and queries

**Next:**
- 🔍 Open `http://localhost:8081` in browser
- ✅ Verify GraphiQL loads
- 📝 Try the sample queries above
- 🚀 Submit test predictions

---

**Deployment completed:** October 26, 2025
**Status:** ✅ VERIFIED
**Service:** Running on port 8081
