# external-service-mirror Dockerfile
# HTTP proxy for Linera contracts to call external APIs

FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build TypeScript
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3002

CMD ["node", "dist/main.js"]
