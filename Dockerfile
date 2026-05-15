# Next.js 16 standalone — image leggera per Coolify
# Multi-stage: deps, build, runtime.

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder env vars per il build step (Next.js esegue codice durante page-data collection).
# A runtime Coolify sovrascrive con i valori reali via container env.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://placeholder@localhost:5432/placeholder" \
    BETTER_AUTH_SECRET="build-only-placeholder-32-chars-min" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN pnpm build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone artifacts (~50MB invece di ~500MB del full node_modules)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
