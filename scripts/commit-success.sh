#!/usr/bin/env bash
set -euo pipefail

commit_message="${1:-}"
if [[ -z "$commit_message" ]]; then
  echo "Usage: ./scripts/commit-success.sh \"feat: message\""
  exit 1
fi

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

pm="$(detect_pm)"

run_script() {
  local script_name="$1"
  case "$pm" in
    pnpm) pnpm run "$script_name" ;;
    yarn) yarn run "$script_name" ;;
    npm) npm run "$script_name" ;;
  esac
}

if ! run_script lint; then
  echo "Lint failed. No commit created."
  exit 1
fi

if ! run_script typecheck; then
  echo "Typecheck failed. No commit created."
  exit 1
fi

if ! run_script test; then
  echo "Tests failed. No commit created."
  exit 1
fi

if ! run_script config:validate; then
  echo "Config validation failed. No commit created."
  exit 1
fi

git add -A

staged_files="$(git diff --cached --name-only || true)"
while IFS= read -r staged_file; do
  case "$staged_file" in
    .env|*/.env|.env.local|*/.env.local|.env.*.local|*/.env.*.local)
      echo "Refusing to commit because .env is staged."
      echo "Unstage it and try again."
      exit 1
      ;;
  esac
done <<< "$staged_files"

if git diff --cached --name-only | grep -E '(^|/)(dev\.db|.*\.sqlite|.*\.sqlite-journal|.*\.log)$' >/dev/null; then
  echo "Refusing to commit because local secret or runtime artifacts are staged."
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$commit_message"

if git remote get-url origin >/dev/null 2>&1; then
  git push origin main
  echo "Checks passed."
  echo "Created local commit."
  echo "Push completed."
else
  echo "Checks passed."
  echo "Created local commit."
  echo "No Git remote configured, so push was skipped."
fi
