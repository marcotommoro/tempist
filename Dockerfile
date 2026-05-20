# syntax=docker/dockerfile:1
# Next.js 16 standalone — image leggera per Coolify
# Multi-stage: deps, build, runtime.
#
# Build secrets (Coolify → "Use Docker build secrets"):
#   Coolify inietta automaticamente `--mount=type=secret,id=X,env=X` su OGNI
#   istruzione RUN per ogni env var marcata "Available at Buildtime".
#   Non serve dichiarare i mount qui — basta usare $X dentro la RUN.
#
#   IMPORTANTE: NODE_ENV NON deve essere "Available at Buildtime", altrimenti
#   `pnpm install` salta le devDependencies e `next build` non trova il binario.

# ---- deps ----
FROM node:26-alpine AS deps
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN apk add --no-cache libc6-compat && npm install -g pnpm@11
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:26-alpine AS build
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN apk add --no-cache libc6-compat && npm install -g pnpm@11
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Coolify inietta i secret come env per questa RUN. Fallback a placeholder se
# qualche secret è assente o vuoto, così `next build` non muore al module-load
# di Better Auth/Drizzle. I valori reali arrivano comunque a runtime via env.
RUN sh -eu -c '\
      export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder@localhost:5432/placeholder}"; \
      export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-build-only-placeholder-secret-32chars-min}"; \
      export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:3000}"; \
      pnpm build \
    '

# ---- runtime ----
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone artifacts (~50MB invece di ~500MB del full node_modules)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
