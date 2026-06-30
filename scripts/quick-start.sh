#!/usr/bin/env bash
set -euo pipefail

detect_pm() {
  if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1 && pnpm --version >/dev/null 2>&1; then
    echo "pnpm"
    return
  fi
  if [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1 && yarn --version >/dev/null 2>&1; then
    echo "yarn"
    return
  fi
  echo "npm"
}

run_pm() {
  local pm="$1"
  shift
  case "$pm" in
    pnpm) pnpm "$@" ;;
    yarn) yarn "$@" ;;
    npm) npm "$@" ;;
  esac
}

ensure_env_file() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  node - "$key" "$value" <<'NODE'
const fs = require('node:fs');
const key = process.argv[2];
const value = process.argv[3];
const filePath = '.env';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let updated = false;
const next = lines.map((line) => {
  if (line.startsWith(`${key}=`)) {
    updated = true;
    return `${key}=${value}`;
  }
  return line;
});
if (!updated) {
  next.push(`${key}=${value}`);
}
fs.writeFileSync(filePath, next.join('\n').replace(/\n+$/, '\n'));
NODE
}

ensure_value_exists() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" .env; then
    set_env_value "$key" "$value"
    return
  fi
  local current
  current="$(grep "^${key}=" .env | head -n 1 | cut -d= -f2-)"
  if [[ -z "$current" || "$current" == replace-with-* ]]; then
    set_env_value "$key" "$value"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

pm="$(detect_pm)"

ensure_env_file

app_secret="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
encryption_key="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
ensure_value_exists APP_SECRET "$app_secret"
ensure_value_exists APP_ENCRYPTION_KEY "$encryption_key"
ensure_value_exists CONFIG_DIR "./config"
ensure_value_exists DEFAULT_SITE_KEY "default-site"
ensure_value_exists DEFAULT_CONTENT_PROFILE_KEY "linkedin-blog-package"

cp .env apps/web/.env

read -r -p "Enter your WordPress site URL: " site_url
if ! node -e "try { const url = new URL(process.argv[1]); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { process.exit(1); }" "$site_url"; then
  echo "Invalid URL."
  exit 1
fi

mkdir -p config/sites config/content-profiles

node --loader tsx --input-type=module - "$site_url" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { createDefaultContentProfile, createDefaultSiteConfig } from './apps/web/server/default-config.ts';

const siteUrl = process.argv[2];
const siteConfigPath = path.resolve('config/sites/default-site.json');
const profilePath = path.resolve('config/content-profiles/linkedin-blog-package.json');

const siteConfig = createDefaultSiteConfig(siteUrl);
if (fs.existsSync(siteConfigPath)) {
  const existing = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
  if (existing.siteUrl !== siteConfig.siteUrl) {
    console.error(`config/sites/default-site.json already exists with siteUrl=${existing.siteUrl}`);
    console.error('Refusing to overwrite the site config.');
    process.exit(1);
  }
} else {
  fs.writeFileSync(siteConfigPath, `${JSON.stringify(siteConfig, null, 2)}\n`);
}

if (!fs.existsSync(profilePath)) {
  fs.writeFileSync(profilePath, `${JSON.stringify(createDefaultContentProfile(), null, 2)}\n`);
}
NODE

if [[ ! -d node_modules ]]; then
  run_pm "$pm" install
fi

run_pm "$pm" run prisma:generate
run_pm "$pm" run prisma:migrate
run_pm "$pm" run prisma:seed
run_pm "$pm" run config:validate
./scripts/package-wordpress-plugin.sh || true

echo "Setup complete."
echo
echo "Open the app:"
echo "http://localhost:3000"
echo
echo "Next steps inside the app:"
echo
echo "1. Go to Settings -> AI Provider"
echo "   Add your OpenAI API key."
echo
echo "2. Go to Settings -> WordPress Site"
echo "   Review the site URL."
echo "   Add your WordPress username."
echo "   Add your WordPress Application Password."
echo
echo "3. Go to Settings -> WordPress Plugin"
echo "   Copy the generated plugin token."
echo "   Install the WordPress plugin zip from dist/ if available."
echo "   Paste the plugin token into the plugin settings in WordPress."
echo
echo "4. Go to Settings -> Content Profile"
echo "   Review preferred tags, hashtags, tone, image style, and SEO rules."
echo
echo "5. Go to Settings -> Site Discovery"
echo "   Run site discovery to retrieve categories, tags, authors, media support, and Jetpack Social status."
echo
echo "6. Create your first draft."
echo
run_pm "$pm" --workspace apps/web run dev
