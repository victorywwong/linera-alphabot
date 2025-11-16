FROM node:20-slim

# Install pnpm and curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* && npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Accept build arg for Next.js public env vars
ARG NEXT_PUBLIC_LINERA_GRAPHQL_URL
ENV NEXT_PUBLIC_LINERA_GRAPHQL_URL=$NEXT_PUBLIC_LINERA_GRAPHQL_URL

# Debug: Print env var value during build
RUN echo "Building with NEXT_PUBLIC_LINERA_GRAPHQL_URL=${NEXT_PUBLIC_LINERA_GRAPHQL_URL}"

# Build Next.js app (env vars are embedded at build time)
RUN pnpm build

# Verify the build included the env var
RUN echo "Build complete. Checking for env var in output..." && \
    find .next/static -name "*.js" -type f | head -1 | xargs grep -q "localhost:8081" && \
    echo "✓ Env var found in build" || \
    echo "✗ Warning: Env var not found in build"

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start Next.js
CMD ["pnpm", "start"]
