#!/usr/bin/env bash
set -euo pipefail

if [[ "${RESET_DEV_CONFIRM:-}" != "yes" ]]; then
  echo "Refusing to reset without explicit confirmation."
  echo "Run: RESET_DEV_CONFIRM=yes ./scripts/reset-dev.sh"
  exit 1
fi

rm -rf apps/web/.next apps/web/node_modules apps/web/dev.db node_modules coverage dist test-results playwright-report
echo "Local development artifacts removed."
