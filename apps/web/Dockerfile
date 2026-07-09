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

# ---- runner: production image ----
# Not using Next's "standalone" output here -- its pruned node_modules only
# traces what server code *imports* at runtime, which excludes the `prisma`
# CLI (invoked as a separate process for `migrate deploy`, see
# docker-entrypoint.sh) and its own deep dependency tree (@prisma/config ->
# effect, etc). Copying the full installed workspace instead guarantees the
# CLI and everything it needs is present, at the cost of image size --
# acceptable for a personal-use tool.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma
# Site/content-profile config JSON read from disk at runtime (ConfigService),
# not bundled into the JS build.
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

# SQLite database lives on a volume mounted here so it survives image
# updates/container recreation (see infra/web/docker-compose.web.yml).
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY apps/web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "--workspace", "apps/web", "start"]
