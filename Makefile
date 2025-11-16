SHELL := /bin/bash

.PHONY: help setup env lint lint-contracts lint-mirror lint-frontend test test-contracts test-mirror test-frontend check e2e linera-local linera-local-http stop-local mirror stop-mirror wallet-init wallet-show wallet-clean check-network check-local check-testnet deploy-bots deploy-bot-simple-ma deploy-bot-deepseek deploy-bot-qwen deploy-bot-gpt-oss show-bots frontend-dev clean

help:
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?#' Makefile | sed 's/:.*?#/ - /'

setup: ## Install toolchains (Rust, pnpm, linera)
	@echo "--> installing Rust toolchain"
	@if ! command -v rustup >/dev/null 2>&1; then curl https://sh.rustup.rs -sSf | sh -s -- -y; else echo "rustup already installed"; fi
	@echo "--> installing pnpm"
	@if ! command -v pnpm >/dev/null 2>&1; then corepack enable && corepack prepare pnpm@latest --activate; else echo "pnpm already installed"; fi
	@echo "--> installing linera-cli"
	@if ! command -v linera >/dev/null 2>&1; then cargo install linera --locked; else echo "linera already installed"; fi

env: ## Copy .env templates into place
	@find . -name ".env.example" -print0 | while IFS= read -r -d '' file; do \
		target="$${file%.example}"; \
		if [ -f "$$target" ]; then continue; fi; \
		echo "Copying $$file -> $$target"; \
		cp "$$file" "$$target"; \
	done

linera-local: ## Start local Linera network with faucet
	@echo "Starting Linera local network (net up --with-faucet)"
	@mkdir -p infra/localnet
	@echo ""
	@echo "🚀 Starting network in background..."
	@nohup linera net up --with-faucet --faucet-port 8080 > infra/localnet/network.log 2>&1 &
	@sleep 3
	@echo ""
	@echo "✅ Linera network started!"
	@echo ""
	@echo "Next steps:"

linera-local-http: ## Start local Linera network with HTTP authorization (api.binance.com, api.inference.net)
	@./infra/scripts/start-network-with-http.sh
	@echo "  1. Initialize wallet:    make wallet-init"
	@echo "  2. Verify setup:         make wallet-show"
	@echo ""
	@echo "📝 Network logs: infra/localnet/network.log"
	@echo "📁 Wallet location: infra/localnet/"
	@echo "🛑 Stop network: make stop-local"
	@echo ""
	@echo "⚠️  Note: This uses a project-specific wallet in infra/localnet/"
	@echo "   Your default wallet remains untouched."

wallet-init: ## Initialize wallet and request chain from faucet
	@echo "Initializing project-specific wallet..."
	@mkdir -p infra/localnet
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 linera wallet init --faucet http://localhost:8080
	@echo ""
	@echo "Requesting chain from faucet..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 linera wallet request-chain --faucet http://localhost:8080
	@echo ""
	@echo "✅ Wallet initialized in infra/localnet/"
	@echo ""
	@echo "To use this wallet, set these environment variables:"
	@echo "  export LINERA_WALLET=\"$(PWD)/infra/localnet/wallet.json\""
	@echo "  export LINERA_KEYSTORE=\"$(PWD)/infra/localnet/keystore.json\""
	@echo "  export LINERA_STORAGE=\"rocksdb:$(PWD)/infra/localnet/wallet.db\""
	@echo ""
	@echo "Or use the helper: source infra/localnet/env.sh"
	@echo ""
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 linera wallet show

stop-local: ## Stop Linera network processes
	@echo "Stopping Linera network..."
	@pkill -f "linera-proxy" || true
	@pkill -f "linera-server" || true
	@pkill -f "linera service" || true
	@pkill -f "linera net up" || true
	@echo "✅ Network stopped"
	@echo ""
	@echo "⚠️  Remember: Wallet is now invalid. Run 'make wallet-clean' before restarting."

mirror: ## Start external-service-mirror (localhost proxy for service.rs HTTP requests)
	@echo "🌐 Starting external-service-mirror on port 3002..."
	@echo ""
	@if [ ! -f external-service-mirror/.env ]; then \
		echo "⚠️  WARNING: external-service-mirror/.env not found"; \
		echo "   Copying from .env.example..."; \
		cp external-service-mirror/.env.example external-service-mirror/.env; \
		echo "   ⚠️  IMPORTANT: Edit external-service-mirror/.env and add your INFERENCE_API_KEY"; \
		echo ""; \
	fi
	@cd external-service-mirror && pnpm install && pnpm dev

stop-mirror: ## Stop external-service-mirror
	@echo "Stopping external-service-mirror..."
	@pkill -f "tsx watch src/main.ts" || true
	@pkill -f "external-service-mirror" || true
	@echo "✅ external-service-mirror stopped"

wallet-show: ## Show wallet status (uses project-specific wallet)
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 linera wallet show

check-network: ## Check which network you're connected to (local or testnet)
	@bash infra/localnet/check-network.sh

check-local: ## Check LOCAL network (sources local env first)
	@echo "Checking LOCAL network configuration..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 bash infra/localnet/check-network.sh

check-testnet: ## Check TESTNET (uses default wallet)
	@echo "Checking TESTNET configuration..."
	@bash -c 'unset LINERA_WALLET LINERA_KEYSTORE LINERA_STORAGE && bash infra/localnet/check-network.sh'

wallet-clean: ## Remove project-specific wallet
	@echo "Removing project wallet..."
	@rm -f infra/localnet/wallet.json
	@rm -f infra/localnet/keystore.json
	@rm -rf infra/localnet/wallet.db
	@echo "✅ Project wallet cleaned (your default wallet is untouched)"

deploy-bots: ## Deploy all 4 bot contracts (simple-ma, deepseek, qwen, gpt-oss)
	@echo "🚀 Deploying all 4 bot contracts..."
	@echo ""
	@mkdir -p infra/localnet
	@rm -f infra/localnet/deployed-bots.txt
	@echo "Deployed Bots - $(shell date)" > infra/localnet/deployed-bots.txt
	@echo "============================================" >> infra/localnet/deployed-bots.txt
	@echo ""
	@$(MAKE) deploy-bot-simple-ma
	@$(MAKE) deploy-bot-deepseek
	@$(MAKE) deploy-bot-qwen
	@$(MAKE) deploy-bot-gpt-oss
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ All 4 bots deployed successfully!"
	@echo ""
	@echo "📋 Deployment summary saved to: infra/localnet/deployed-bots.txt"
	@echo ""
	@echo "View deployed bots: make show-bots"
	@echo ""

deploy-bot-simple-ma: ## Deploy SimpleMA bot contract
	@echo "📦 Deploying SimpleMA bot..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 cd contracts && \
	 cargo build --release --target wasm32-unknown-unknown 2>&1 | grep -q 'Finished' && \
	 APP_ID=$$(linera project publish-and-create bot-state --json-argument '"alphabot-simple-ma"' 2>/dev/null) && \
	 CHAIN_ID=$$(linera wallet show 2>/dev/null | grep -E '^│ [a-f0-9]{64}' | head -1 | awk '{print $$2}') && \
	 echo "" >> ../infra/localnet/deployed-bots.txt && \
	 echo "Bot: simple-ma" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  App ID:   $$APP_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  Chain ID: $$CHAIN_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  GraphQL:  http://localhost:8081/chains/$$CHAIN_ID/applications/$$APP_ID/graphql" >> ../infra/localnet/deployed-bots.txt && \
	 echo "✅ SimpleMA deployed: $$APP_ID"

deploy-bot-deepseek: ## Deploy DeepSeek bot contract
	@echo "📦 Deploying DeepSeek bot..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 cd contracts && \
	 APP_ID=$$(linera project publish-and-create bot-state --json-argument '"alphabot-deepseek"' 2>/dev/null) && \
	 CHAIN_ID=$$(linera wallet show 2>/dev/null | grep -E '^│ [a-f0-9]{64}' | head -1 | awk '{print $$2}') && \
	 echo "" >> ../infra/localnet/deployed-bots.txt && \
	 echo "Bot: deepseek" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  App ID:   $$APP_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  Chain ID: $$CHAIN_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  GraphQL:  http://localhost:8081/chains/$$CHAIN_ID/applications/$$APP_ID/graphql" >> ../infra/localnet/deployed-bots.txt && \
	 echo "✅ DeepSeek deployed: $$APP_ID"

deploy-bot-qwen: ## Deploy Qwen bot contract
	@echo "📦 Deploying Qwen bot..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 cd contracts && \
	 APP_ID=$$(linera project publish-and-create bot-state --json-argument '"alphabot-qwen"' 2>/dev/null) && \
	 CHAIN_ID=$$(linera wallet show 2>/dev/null | grep -E '^│ [a-f0-9]{64}' | head -1 | awk '{print $$2}') && \
	 echo "" >> ../infra/localnet/deployed-bots.txt && \
	 echo "Bot: qwen-vertex" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  App ID:   $$APP_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  Chain ID: $$CHAIN_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  GraphQL:  http://localhost:8081/chains/$$CHAIN_ID/applications/$$APP_ID/graphql" >> ../infra/localnet/deployed-bots.txt && \
	 echo "✅ Qwen deployed: $$APP_ID"

deploy-bot-gpt-oss: ## Deploy GPT-OSS bot contract
	@echo "📦 Deploying GPT-OSS bot..."
	@export LINERA_WALLET="$(PWD)/infra/localnet/wallet.json" && \
	 export LINERA_KEYSTORE="$(PWD)/infra/localnet/keystore.json" && \
	 export LINERA_STORAGE="rocksdb:$(PWD)/infra/localnet/wallet.db" && \
	 cd contracts && \
	 APP_ID=$$(linera project publish-and-create bot-state --json-argument '"alphabot-gpt-oss"' 2>/dev/null) && \
	 CHAIN_ID=$$(linera wallet show 2>/dev/null | grep -E '^│ [a-f0-9]{64}' | head -1 | awk '{print $$2}') && \
	 echo "" >> ../infra/localnet/deployed-bots.txt && \
	 echo "Bot: gpt-oss-vertex" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  App ID:   $$APP_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  Chain ID: $$CHAIN_ID" >> ../infra/localnet/deployed-bots.txt && \
	 echo "  GraphQL:  http://localhost:8081/chains/$$CHAIN_ID/applications/$$APP_ID/graphql" >> ../infra/localnet/deployed-bots.txt && \
	 echo "✅ GPT-OSS deployed: $$APP_ID"

show-bots: ## Show all deployed bots
	@if [ -f infra/localnet/deployed-bots.txt ]; then \
		cat infra/localnet/deployed-bots.txt; \
	else \
		echo "❌ No bots deployed yet. Run: make deploy-bots"; \
	fi

lint: lint-contracts lint-mirror lint-frontend ## Run all linters

lint-contracts:
	@if [ -d contracts ]; then \
		if command -v cargo >/dev/null 2>&1; then \
			( cd contracts && cargo fmt --all --check && cargo clippy --all-targets --all-features -- -D warnings ); \
		else \
			echo "cargo not installed; skipping contract lint"; \
		fi; \
	else \
		echo "contracts dir missing; skipping"; \
	fi

lint-mirror:
	@if [ -d external-service-mirror ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd external-service-mirror && pnpm lint ); \
		else \
			echo "pnpm not installed; skipping external-service-mirror lint"; \
		fi; \
	else \
		echo "external-service-mirror dir missing; skipping"; \
	fi

lint-frontend:
	@if [ -d frontend ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd frontend && pnpm lint ); \
		else \
			echo "pnpm not installed; skipping frontend lint"; \
		fi; \
	else \
		echo "frontend dir missing; skipping"; \
	fi

test: test-contracts test-mirror test-frontend ## Run all unit/integration tests

test-contracts:
	@if [ -d contracts ]; then \
		if command -v cargo >/dev/null 2>&1; then \
			( cd contracts && cargo test ); \
		else \
			echo "cargo not installed; skipping contract tests"; \
		fi; \
	else \
		echo "contracts dir missing; skipping"; \
	fi

test-mirror:
	@if [ -d external-service-mirror ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd external-service-mirror && pnpm test ); \
		else \
			echo "pnpm not installed; skipping external-service-mirror tests"; \
		fi; \
	else \
		echo "external-service-mirror dir missing; skipping"; \
	fi

test-frontend:
	@if [ -d frontend ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd frontend && pnpm test ); \
		else \
			echo "pnpm not installed; skipping frontend tests"; \
		fi; \
	else \
		echo "frontend dir missing; skipping"; \
	fi

check: lint test ## Run lint + test

e2e: ## Run full E2E test suite (see E2E_TESTING.md for full guide)
	@echo "🧪 Starting E2E test suite..."
	@echo ""
	@echo "For full E2E testing guide, see: E2E_TESTING.md"
	@echo ""
	@echo "Quick E2E flow:"
	@echo "  1. make linera-local    # Start network"
	@echo "  2. make wallet-init     # Initialize wallet"
	@echo "  3. Deploy contract:     cd contracts && linera project publish-and-create bot-state --json-argument '\"alphabot-test\"'"
	@echo "  4. make mirror          # Start external-service-mirror"
	@echo "  5. cd frontend && pnpm dev  # Start frontend"
	@echo ""
	@echo "See E2E_TESTING.md for detailed instructions"

frontend-dev: ## Start frontend dev server (make sure .env.local is configured)
	@echo "🌐 Starting frontend dev server..."
	@echo ""
	@if [ ! -f frontend/.env.local ]; then \
		echo "⚠️  WARNING: frontend/.env.local not found"; \
		echo "   Please create it with:"; \
		echo "   NEXT_PUBLIC_LINERA_GRAPHQL_URL=http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID>"; \
		echo ""; \
		exit 1; \
	fi
	@cd frontend && pnpm dev

clean: ## Remove generated artifacts (localnet, node_modules, dist, target)
	@rm -rf infra/localnet
	@find . -name "node_modules" -o -name "dist" -o -name "target" | xargs -r rm -rf

