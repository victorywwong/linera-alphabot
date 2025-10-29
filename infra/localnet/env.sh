#!/bin/bash
# Linera Local Development Environment
# Source this file to use the project-specific wallet

# Get the directory of this script (works when sourced)
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
else
    SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
fi

# Set Linera wallet paths (in infra/localnet/)
export LINERA_WALLET="$SCRIPT_DIR/wallet.json"
export LINERA_KEYSTORE="$SCRIPT_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$SCRIPT_DIR/wallet.db"

echo "✅ Linera environment configured!"
echo ""
echo "Wallet paths:"
echo "  LINERA_WALLET=$LINERA_WALLET"
echo "  LINERA_KEYSTORE=$LINERA_KEYSTORE"
echo "  LINERA_STORAGE=$LINERA_STORAGE"
echo ""
echo "Test with: linera wallet show"
