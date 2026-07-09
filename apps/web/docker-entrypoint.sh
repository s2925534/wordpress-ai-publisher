#!/bin/sh
set -e

# Applies any migrations not yet present in the mounted SQLite volume
# (idempotent -- no-ops once the volume is up to date). Runs on every
# container start, including Watchtower auto-updates, so new migrations
# ship automatically with a new image.
#
# Invoked via its real file, not the node_modules/.bin/prisma symlink --
# the CLI resolves its own sibling .wasm files relative to its own real
# location, and Docker's COPY of a symlink loses that relative context.
node node_modules/prisma/build/index.js migrate deploy --schema=apps/web/prisma/schema.prisma

exec "$@"
