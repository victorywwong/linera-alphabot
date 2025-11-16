#!/bin/bash
# Start Linera localnet with HTTP authorization configured in genesis
# Simplified version - use linera net up then modify genesis

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRA_DIR")"
LOCALNET_DIR="$INFRA_DIR/localnet"

echo "❌ NOTICE: This approach doesn't work with 'linera net up'"
echo ""
echo "The issue: 'linera net up' doesn't expose --http-request-allow-list parameter"
echo "The fix requires either:"
echo "  1. Using Docker Compose setup (https://linera.dev/operators/devnets/compose.html)"
echo "  2. Manually setting up validators with linera-server (complex)"
echo "  3. Modifying Linera source code"
echo ""
echo "For now, use bot-service (Node.js) for HTTP requests instead of service.rs"
echo "See: PROGRESS_SUMMARIES/HTTP_AUTH_ISSUE.md for details"
echo ""
exit 1
