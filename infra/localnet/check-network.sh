#!/bin/bash
# Check which Linera network you're connected to

echo "🔍 Checking Linera Network Configuration..."
echo ""

# Check wallet location
WALLET_PATH="${LINERA_WALLET:-$HOME/Library/Application Support/linera/wallet.json}"

echo "📁 Wallet Location:"
if [ -z "$LINERA_WALLET" ]; then
    echo "   Using DEFAULT wallet: $WALLET_PATH"
    echo "   → Likely TESTNET"
else
    echo "   Using CUSTOM wallet: $WALLET_PATH"
    if [[ "$WALLET_PATH" == *"infra/localnet"* ]]; then
        echo "   → This is LOCAL network ✅"
    else
        echo "   → This is TESTNET or custom"
    fi
fi

echo ""
echo "🔗 Environment Variables:"
if [ -z "$LINERA_WALLET" ]; then
    echo "   LINERA_WALLET: (not set - using default)"
    echo "   LINERA_KEYSTORE: (not set - using default)"
    echo "   LINERA_STORAGE: (not set - using default)"
else
    echo "   LINERA_WALLET: $LINERA_WALLET"
    echo "   LINERA_KEYSTORE: ${LINERA_KEYSTORE:-not set}"
    echo "   LINERA_STORAGE: ${LINERA_STORAGE:-not set}"
fi

echo ""
echo "📊 Wallet Status:"
if linera wallet show > /dev/null 2>&1; then
    echo "   ✅ Wallet accessible"

    # Try to detect network type from chains
    CHAIN_COUNT=$(linera wallet show 2>/dev/null | grep -E "^│ [a-f0-9]" | wc -l | tr -d ' ')
    echo "   📝 Number of chains: $CHAIN_COUNT"

    if [[ "$WALLET_PATH" == *"infra/localnet"* ]]; then
        echo ""
        echo "🌐 Network Type: LOCAL DEVELOPMENT"
        echo "   Faucet: http://localhost:8080"
        echo "   GraphQL: http://localhost:8080/chains/<CHAIN_ID>"
    else
        echo ""
        echo "🌐 Network Type: TESTNET (or other)"
        echo "   Check your network configuration"
    fi
else
    echo "   ❌ Wallet not accessible"
fi

echo ""
echo "💡 Quick Commands:"
if [[ "$WALLET_PATH" == *"infra/localnet"* ]]; then
    echo "   You're using LOCAL network ✅"
    echo "   - Deploy: linera project publish-and-create <app>"
    echo "   - Switch to testnet: unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE"
else
    echo "   You're using DEFAULT wallet (likely TESTNET)"
    echo "   - Switch to local: source infra/localnet/env.sh"
    echo "   - Or use: make wallet-show"
fi
echo ""
