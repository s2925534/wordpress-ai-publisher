#!/bin/sh
set -e

# Applies any migrations not yet present in the mounted SQLite volume
# (idempotent -- no-ops once the volume is up to date). Runs on every
# container start, including Watchtower auto-updates, so new migrations
# ship automatically with a new image.
node_modules/.bin/prisma migrate deploy --schema=apps/web/prisma/schema.prisma

exec "$@"
