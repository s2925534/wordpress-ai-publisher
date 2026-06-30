# WordPress Plugin

The plugin now lives in `wordpress-plugin/publisher-plugin`.

It includes:
- token validation scaffolding
- REST controller registration
- site discovery helpers
- categories, tags, authors, recent posts, media, post, and Jetpack service scaffolding
- structured REST responses with explicit success and error envelopes
- token-based request validation using the locally stored plugin token managed from the app settings screen

The next phase will build on these endpoints for discovery, publishing, and duplicate-protection flows in the app.

## Install

1. Copy `wordpress-plugin/publisher-plugin` into `wp-content/plugins/`.
2. Activate the plugin in WordPress.
3. Copy the plugin token from the app settings screen into the plugin settings in WordPress.

## What the plugin token is for

The plugin token is a shared secret used to authorize calls from the local app to the WordPress plugin's custom REST endpoints. The plugin checks it against the `X-Publisher-Token` header before returning discovery data or accepting publishing requests.

## Pack the plugin

Run:

```bash
./scripts/package-wordpress-plugin.sh
```

This creates `dist/publisher-plugin.zip` when the plugin directory is present.
