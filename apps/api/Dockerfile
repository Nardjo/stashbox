# syntax=docker/dockerfile:1.7

# ─── base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache wget tini && \
    corepack enable && \
    corepack prepare pnpm@10.22.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# ─── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── builder ───────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
RUN pnpm --filter @stashbox/shared build

COPY apps/api ./apps/api
RUN pnpm --filter @stashbox/api build

# ─── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV LOG_LEVEL=info
ENV TZ=UTC

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/build ./apps/api/build

RUN pnpm install --frozen-lockfile --prod --filter @stashbox/api... --ignore-scripts && \
    chown -R app:app /app

USER app
WORKDIR /app/apps/api/build

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3333/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
