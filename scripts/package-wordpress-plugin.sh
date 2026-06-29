#!/usr/bin/env bash
set -euo pipefail

plugin_dir="wordpress-plugin/publisher-plugin"
dist_dir="dist"

if [[ ! -d "$plugin_dir" ]]; then
  echo "WordPress plugin directory is not present yet. Skipping packaging."
  exit 0
fi

mkdir -p "$dist_dir"
zip_path="$dist_dir/publisher-plugin.zip"
rm -f "$zip_path"
(
  cd "$plugin_dir"
  zip -qr "../../$zip_path" .
)
echo "Packaged plugin at $zip_path"
