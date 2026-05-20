# syntax=docker/dockerfile:1.7
# Next.js 16 standalone — image leggera per Coolify
# Multi-stage: deps, build, runtime.
#
# Build secrets (Coolify → "Use Docker build secrets"):
#   I valori sono montati solo durante `RUN pnpm build`, MAI scritti nei layer.
#   Coolify espone ogni env var marcata come secret con `id=<NOME_VAR>`.
#
#   docker buildx build \
#     --secret id=DATABASE_URL,env=DATABASE_URL \
#     --secret id=BETTER_AUTH_SECRET,env=BETTER_AUTH_SECRET \
#     --secret id=BETTER_AUTH_URL,env=BETTER_AUTH_URL \
#     -t todoist-app .

# ---- deps ----
FROM node:26-alpine AS deps
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN apk add --no-cache libc6-compat && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:26-alpine AS build
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN apk add --no-cache libc6-compat && corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Le env sopra valgono per tutto il layer; i secret sotto solo per la singola RUN
# e non vengono mai persistiti nell'image.
RUN --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL,required=true \
    --mount=type=secret,id=BETTER_AUTH_SECRET,env=BETTER_AUTH_SECRET,required=true \
    --mount=type=secret,id=BETTER_AUTH_URL,env=BETTER_AUTH_URL,required=true \
    --mount=type=secret,id=RESEND_API_KEY,env=RESEND_API_KEY \
    --mount=type=secret,id=RESEND_FROM_EMAIL,env=RESEND_FROM_EMAIL \
    --mount=type=secret,id=GOOGLE_CLIENT_ID,env=GOOGLE_CLIENT_ID \
    --mount=type=secret,id=GOOGLE_CLIENT_SECRET,env=GOOGLE_CLIENT_SECRET \
    --mount=type=secret,id=GITHUB_CLIENT_ID,env=GITHUB_CLIENT_ID \
    --mount=type=secret,id=GITHUB_CLIENT_SECRET,env=GITHUB_CLIENT_SECRET \
    pnpm build

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
