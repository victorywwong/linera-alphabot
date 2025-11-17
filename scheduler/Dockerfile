# Scheduler Dockerfile
# Just-in-Time Oracle - Triggers predictions via GraphQL

FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build TypeScript
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Start scheduler
CMD ["node", "dist/index.js"]
