#!/bin/bash
# AlphaBot Environment Setup Script
# Creates .env files from .env.example templates

set -e

echo "==================================================================="
echo "  AlphaBot Environment Setup"
echo "==================================================================="
echo ""

# Function to create .env from .env.example
setup_env() {
  local dir=$1
  local name=$2

  if [ -f "$dir/.env.example" ]; then
    if [ -f "$dir/.env" ]; then
      echo "✓ $name/.env already exists (skipping)"
    else
      cp "$dir/.env.example" "$dir/.env"
      echo "✓ Created $name/.env from .env.example"
    fi
  else
    echo "⚠ Warning: $name/.env.example not found"
  fi
}

# Setup environment files
setup_env "scheduler" "scheduler"
setup_env "external-service-mirror" "external-service-mirror"
setup_env "bot-service" "bot-service"

# Frontend uses .env.local
if [ -f "frontend/.env.local" ]; then
  echo "✓ frontend/.env.local already exists (skipping)"
elif [ -f "frontend/.env.example" ]; then
  cp "frontend/.env.example" "frontend/.env.local"
  echo "✓ Created frontend/.env.local from .env.example"
else
  echo "⚠ Warning: frontend/.env.example not found"
fi

echo ""
echo "==================================================================="
echo "  Next Steps:"
echo "==================================================================="
echo ""
echo "1. Update scheduler/.env with your Linera GraphQL endpoint:"
echo "   LINERA_GRAPHQL_URL=http://localhost:8081/chains/{CHAIN_ID}/applications/{APP_ID}"
echo ""
echo "2. Add your inference.net API key to:"
echo "   - scheduler/.env: INFERENCE_API_KEY=your_key"
echo "   - external-service-mirror/.env: INFERENCE_API_KEY=your_key"
echo ""
echo "3. Start Linera localnet and deploy contract:"
echo "   make linera-local && make wallet-init"
echo "   cd contracts && linera project publish-and-create bot-state --json-argument '\"my-bot\"'"
echo ""
echo "4. Start services with Docker Compose:"
echo "   docker compose up -d"
echo ""
echo "5. View logs:"
echo "   docker compose logs -f"
echo ""
echo "==================================================================="
