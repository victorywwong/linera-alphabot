# GraphQL Query Guide for Bot-State Contract

## Understanding Linera GraphQL Structure

Linera applications are **chain-scoped**, meaning each application instance lives on a specific chain. You need to query through the chain to access the application.

---

## Chain Information

From your deployment:
- **Main Chain ID:** `bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4`
- **Bytecode ID:** `4ca069379fea0a7469a14612f4d323f12f600d166a85d451ff8966743013d42b`
- **Bot ID:** `"alpha-bot-1"`

---

## Correct Query Patterns

### 1. Query Through Chain (Recommended)

Access the **chain-specific GraphiQL** endpoint:

```
http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4
```

Then query:

```graphql
{
  applications {
    id
    link
  }
}
```

This will show all applications on that chain, including your bot-state app.

---

### 2. Find Application by Bytecode ID

Once you have the application ID from step 1, you can query the specific application:

```
http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/applications/<APP_ID>
```

---

### 3. Query Bot State Directly

The application should expose custom queries based on your contract's service definition. Try:

```graphql
{
  botState {
    botId
    latestSignal {
      timestamp
      action
      predictedPriceMicro
      confidenceBps
      reasoning
      actualPriceMicro
    }
    accuracy24h {
      rmseMicro
      directionalAccuracyBps
      totalPredictions
      correctPredictions
      lastUpdated
    }
    followerCount
  }
}
```

---

## Step-by-Step: Find Your Application

### Step 1: Open Chain-Specific GraphiQL

In your browser:
```
http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4
```

### Step 2: List Applications

Run this query:

```graphql
{
  applications {
    id
    link
  }
}
```

**Expected Output:**
```json
{
  "data": {
    "applications": [
      {
        "id": "<APPLICATION_ID>",
        "link": "/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/applications/<APPLICATION_ID>"
      }
    ]
  }
}
```

### Step 3: Access Application GraphiQL

Click the `link` or navigate to:
```
http://localhost:8081<LINK_FROM_STEP_2>
```

This gives you the **application-specific GraphiQL interface** where you can query bot state.

---

## Application-Specific Queries

Once you're at the application GraphiQL endpoint, try these:

### Query 1: Get Bot ID
```graphql
{
  botState {
    botId
  }
}
```

**Expected:**
```json
{
  "data": {
    "botState": {
      "botId": "alpha-bot-1"
    }
  }
}
```

### Query 2: Get Latest Signal
```graphql
{
  botState {
    latestSignal {
      timestamp
      action
      predictedPriceMicro
      confidenceBps
      reasoning
    }
  }
}
```

**Expected (no predictions yet):**
```json
{
  "data": {
    "botState": {
      "latestSignal": null
    }
  }
}
```

### Query 3: Get Accuracy Metrics
```graphql
{
  botState {
    accuracy24h {
      directionalAccuracyBps
      totalPredictions
      correctPredictions
    }
  }
}
```

### Query 4: Get Follower Count
```graphql
{
  botState {
    followerCount
  }
}
```

---

## Mutations (Write Operations)

### Submit a Prediction

```graphql
mutation SubmitPrediction {
  submitPrediction(
    timestamp: 1730000000000
    action: BUY
    predictedPriceMicro: 3500000000
    confidenceBps: 8500
    reasoning: "Test prediction for Wave 1"
  )
}
```

**Price Conversion:**
```
$3500.00 × 1,000,000 = 3,500,000,000 micro-USD
```

**Confidence Conversion:**
```
85% × 100 = 8500 basis points
```

### Resolve a Signal

```graphql
mutation ResolveSignal {
  resolveSignal(
    timestamp: 1730000000000
    actualPriceMicro: 3520000000
  )
}
```

### Add Follower

```graphql
mutation AddFollower {
  addFollower
}
```

### Remove Follower

```graphql
mutation RemoveFollower {
  removeFollower
}
```

---

## GraphQL Endpoint URLs

### Root GraphiQL
```
http://localhost:8081
```
- Lists all chains
- Global queries

### Chain-Specific GraphiQL
```
http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4
```
- Lists applications on this chain
- Chain-specific queries

### Application-Specific GraphiQL
```
http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>
```
- Application state queries
- Application mutations
- **This is where you query `botState`**

---

## Common Errors and Solutions

### Error: Unknown field "application"

**Problem:**
```graphql
{
  application(applicationId: "...") {  # ❌ WRONG
    id
  }
}
```

**Solution:**
```graphql
{
  applications {  # ✅ CORRECT (plural)
    id
    link
  }
}
```

### Error: Cannot query field "botState" on type "QueryRoot"

**Problem:** You're at the wrong GraphQL endpoint (root or chain level)

**Solution:** Navigate to the **application-specific** GraphiQL endpoint

### Error: Field "latestSignal" returns null

**This is correct!** No predictions have been submitted yet.

**Solution:** Submit a prediction first using the mutation

---

## Quick Start Commands

### Using Browser (Easiest)

1. **Open chain GraphiQL:**
   ```
   http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4
   ```

2. **Run this query:**
   ```graphql
   { applications { id link } }
   ```

3. **Click the link** to access application GraphiQL

4. **Query bot state:**
   ```graphql
   { botState { botId followerCount } }
   ```

### Using curl

```bash
# Step 1: Get application ID
curl -X POST \
  "http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ applications { id } }"}'

# Step 2: Query bot state (replace <APP_ID>)
curl -X POST \
  "http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4/applications/<APP_ID>/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ botState { botId } }"}'
```

---

## Testing Workflow

### 1. Verify Application Deployed

```graphql
# At: http://localhost:8081/chains/<CHAIN_ID>
{
  applications {
    id
    link
  }
}
```

### 2. Check Initial State

```graphql
# At: http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>
{
  botState {
    botId
    latestSignal
    followerCount
  }
}
```

**Expected:**
```json
{
  "botId": "alpha-bot-1",
  "latestSignal": null,
  "followerCount": 0
}
```

### 3. Submit First Prediction

```graphql
mutation {
  submitPrediction(
    timestamp: 1730000000000
    action: BUY
    predictedPriceMicro: 3500000000
    confidenceBps: 8500
    reasoning: "First test prediction"
  )
}
```

### 4. Verify Signal Stored

```graphql
{
  botState {
    latestSignal {
      timestamp
      action
      predictedPriceMicro
      confidenceBps
      reasoning
    }
  }
}
```

### 5. Test Follower Operations

```graphql
mutation { addFollower }
```

Then verify:

```graphql
{
  botState {
    followerCount
  }
}
```

**Expected:** `followerCount: 1`

---

## Schema Introspection

To see all available queries and mutations:

```graphql
{
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
    mutationType {
      fields {
        name
        description
      }
    }
  }
}
```

---

## Summary

**Key Points:**
1. ✅ Use **chain-specific** GraphiQL endpoints
2. ✅ Applications are accessed via `/chains/<CHAIN_ID>/applications/<APP_ID>`
3. ✅ `botState` queries only work at the application endpoint
4. ✅ Use `applications` (plural), not `application` (singular)

**Next Steps:**
1. Open chain GraphiQL in browser
2. Find your application ID
3. Navigate to application GraphiQL
4. Query bot state and submit test predictions

---

**Your Endpoints:**
- **Chain:** `http://localhost:8081/chains/bc87caebb95cc08c152b77f31842273cc57c6984413f7a3ad3c2599772a26cb4`
- **App:** Will be shown after you query `applications { link }`
