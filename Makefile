SHELL := /bin/bash

.PHONY: help setup env lint lint-contracts lint-bot-service lint-frontend test test-contracts test-bot-service test-frontend check e2e linera-local stop-local clean

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

lint: lint-contracts lint-bot-service lint-frontend ## Run all linters

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

lint-bot-service:
	@if [ -d bot-service ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd bot-service && pnpm lint ); \
		else \
			echo "pnpm not installed; skipping bot-service lint"; \
		fi; \
	else \
		echo "bot-service dir missing; skipping"; \
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

test: test-contracts test-bot-service test-frontend ## Run all unit/integration tests

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

test-bot-service:
	@if [ -d bot-service ]; then \
		if command -v pnpm >/dev/null 2>&1; then \
			( cd bot-service && pnpm test ); \
		else \
			echo "pnpm not installed; skipping bot-service tests"; \
		fi; \
	else \
		echo "bot-service dir missing; skipping"; \
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

e2e: ## Execute end-to-end suite once Playwright is available
	@echo "TODO: add Playwright command once frontend scaffolding lands"

clean: ## Remove generated artifacts
	@rm -rf infra/localnet
	@find . -name "node_modules" -o -name "dist" -o -name "target" | xargs -r rm -rf

