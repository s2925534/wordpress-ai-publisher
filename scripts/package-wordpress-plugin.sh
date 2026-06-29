#!/usr/bin/env bash
set -euo pipefail

plugin_dir="wordpress-plugin/publisher-plugin"
dist_dir="dist"

if [[ ! -d "$plugin_dir" ]]; then
  echo "WordPress plugin directory is not present yet. Skipping packaging."
  exit 0
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is not installed. Skipping plugin packaging."
  exit 0
fi

mkdir -p "$dist_dir"
zip_path="$dist_dir/publisher-plugin.zip"
rm -f "$zip_path"
(
  cd wordpress-plugin
  zip -qr "../$zip_path" publisher-plugin
)
echo "Packaged plugin at $zip_path"
