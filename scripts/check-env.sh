#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env is missing. Run ./scripts/quick-start.sh first."
  exit 1
fi

required_keys=(
  APP_URL
  APP_ENV
  APP_SECRET
  APP_ENCRYPTION_KEY
  DATABASE_URL
  CONFIG_DIR
  DEFAULT_SITE_KEY
  DEFAULT_CONTENT_PROFILE_KEY
)

missing=0
for key in "${required_keys[@]}"; do
  if ! grep -q "^${key}=" .env; then
    echo "Missing required env key: ${key}"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "Environment file looks valid."
