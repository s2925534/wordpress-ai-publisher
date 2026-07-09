# Deployment

The app is a standard containerized Next.js + Prisma/SQLite service. Nothing
about deployment is tied to a specific host, registry, or domain -- swap the
placeholders below for your own.

## Build

`apps/web/Dockerfile` builds the app (build context is the repo root, since
this is an npm workspace):

```bash
docker build -f apps/web/Dockerfile -t your-registry/wordpress-ai-publisher:latest .
```

The image copies the full built workspace into the runner stage rather than
using Next's "standalone" output, because the Prisma CLI (used for
`prisma migrate deploy` at container start, see `apps/web/docker-entrypoint.sh`)
needs its full dependency tree, which standalone's pruned tracing doesn't
include.

## Run

`infra/web/docker-compose.web.yml` is a working example. Copy
`infra/web/.env.example` to `infra/web/.env` and fill in real values:

- `APP_URL` -- the public URL this instance will be served from, e.g.
  `https://app.example.com`
- `APP_SECRET` / `APP_ENCRYPTION_KEY` -- generate each with
  `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `DATABASE_URL` -- an absolute `file:` path onto a persistent volume (e.g.
  `file:/app/data/production.db`), so the SQLite database survives image
  updates/container recreation. A relative path resolves against the Prisma
  schema's own directory, not the container's working directory -- use
  absolute paths to avoid surprises.

```bash
docker compose -f infra/web/docker-compose.web.yml up -d
```

The entrypoint runs `prisma migrate deploy` against the mounted volume
before starting the server, so new migrations ship automatically with a new
image -- no separate migration step needed.

## Continuous deployment

`.github/workflows/docker-publish.yml` builds and pushes `:latest` (and a
short-SHA tag for rollback) to GHCR on every push to `main` that touches
`apps/web/**`, `config/**`, or the lockfiles. Point your own CD mechanism
(Watchtower, a webhook, a scheduled pull, or manual `docker compose pull &&
docker compose up -d`) at that tag to auto-deploy new commits.

## Settings after first boot

OpenAI credentials and the WordPress site connection are entered through the
app's own Settings page after deployment (stored encrypted in the SQLite
database), not via environment variables -- each deployed instance manages
its own credentials independently.
