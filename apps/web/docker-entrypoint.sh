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

# Seeds the first local admin user from ADMIN_EMAIL/ADMIN_PASSWORD on an
# empty database only; a no-op on every later boot once a user exists (see
# server/bootstrap-admin.ts). Same real-file rationale as the prisma
# invocation above -- node_modules/.bin/tsx is also a symlink.
#
# TSX_TSCONFIG_PATH is required here: tsx's tsconfig discovery walks up from
# WORKDIR (/app), which has no tsconfig.json of its own (only apps/web/ does,
# and tsx doesn't look into subdirectories) -- without it, the `@/*` path
# alias used by server/auth-service.ts fails to resolve at runtime.
TSX_TSCONFIG_PATH=apps/web/tsconfig.json node node_modules/tsx/dist/cli.mjs apps/web/server/bootstrap-admin.ts

exec "$@"
