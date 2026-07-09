# Build from the repo root: docker build -f apps/web/Dockerfile .
# (npm workspaces -- package-lock.json lives at the repo root)

FROM node:20-slim AS base
# Prisma's query engine needs libssl at both generate-time and runtime on
# Debian. ca-certificates is needed for any outbound HTTPS calls (OpenAI,
# WordPress REST API) from inside the container.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- deps: install the full workspace ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/prisma ./apps/web/prisma
RUN npm ci

# ---- builder: generate the Prisma client and build the Next.js app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN npm run --workspace apps/web prisma:generate
RUN npm run --workspace apps/web build

# ---- runner: minimal production image, Next.js standalone output ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Site/content-profile config JSON read from disk at runtime (ConfigService),
# not bundled into the JS build.
COPY --from=builder /app/config ./config

# Next's standalone tracing only bundles what server code actually imports
# (@prisma/client + its generated engine) -- the `prisma` CLI package is
# invoked as a separate process for `migrate deploy` at container start
# (see docker-entrypoint.sh), so it isn't traced and has to be copied in
# explicitly. It needs its @prisma/* siblings too (engines, fetch-engine,
# get-platform, ...) -- copy the whole scope rather than guessing which
# subpackages `migrate deploy` reaches into. Deliberately not copying
# node_modules/.bin/prisma (a symlink to prisma/build/index.js) -- the CLI
# resolves sibling .wasm files relative to its own real path, and that
# resolution breaks once Docker copies the symlink; invoked by real path
# instead in docker-entrypoint.sh.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma

# SQLite database lives on a volume mounted here so it survives image
# updates/container recreation (see infra/web/docker-compose.web.yml).
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
