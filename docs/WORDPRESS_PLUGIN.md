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

1. Open the app and go to `Settings`.
2. Download the plugin zip from the `WordPress Plugin` card.
3. In WordPress, go to `Plugins -> Add New -> Upload Plugin` and upload the zip.
4. Activate the plugin in WordPress.
5. Generate or copy the plugin token from the `WordPress Site` section in the app settings screen.
6. In WordPress admin, go to `Settings -> Publisher Plugin`.
7. Paste that token into the `Plugin token` field and save it.
8. If you are not using the custom plugin yet, you can leave the token empty.

## What the plugin token is for

The plugin token is a shared secret used to authorize calls from the local app to the WordPress plugin's custom REST endpoints. The plugin checks it against the `X-Publisher-Token` header before returning discovery data or accepting publishing requests.

## Pack the plugin

The app can download the plugin zip directly from the settings screen. If you prefer a manual
build, run:

```bash
./scripts/package-wordpress-plugin.sh
```

This creates `dist/publisher-plugin.zip` when the plugin directory is present.
