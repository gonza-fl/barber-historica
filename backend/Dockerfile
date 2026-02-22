# ── Stage 1: Install production dependencies ──────────────────────
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: Build TypeScript & generate Prisma Client ────────────
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client (outputs to generated/prisma by default in v7)
RUN pnpm prisma generate

# Compile TypeScript
RUN pnpm run build

# ── Stage 3: Production runner ────────────────────────────────────
FROM node:22-slim AS runner

# OpenSSL is required by Prisma engine binaries
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled JS output
COPY --from=build /app/dist ./dist

# Copy Prisma schema (needed at runtime) and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for ESM "type":"module" resolution
COPY package.json ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
