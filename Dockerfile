FROM rust:1.86-slim

SHELL ["bash", "-c"]

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Linera services
RUN cargo install --locked linera-service@0.15.5 linera-storage-service@0.15.5

# Install Node.js via nvm and pnpm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.40.3/install.sh | bash \
    && . ~/.nvm/nvm.sh \
    && nvm install lts/krypton \
    && npm install -g pnpm

# Set working directory
WORKDIR /build

# Healthcheck for frontend on port 5173
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Run the build and execution script
ENTRYPOINT ["bash", "/build/run.bash"]
