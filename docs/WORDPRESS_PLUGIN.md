# WordPress Plugin

The plugin now lives in `wordpress-plugin/publisher-plugin`.

It includes:
- token validation scaffolding
- REST controller registration
- site discovery helpers
- categories, tags, authors, recent posts, media, post, and Jetpack service scaffolding
- structured REST responses with explicit success and error envelopes
- token-based request validation using the `publisher_plugin_token` option or `PUBLISHER_PLUGIN_TOKEN` constant

The next phase will build on these endpoints for discovery, publishing, and duplicate-protection flows in the app.

## Install

1. Copy `wordpress-plugin/publisher-plugin` into `wp-content/plugins/`.
2. Activate the plugin in WordPress.
3. Set the plugin token in WordPress if you are using the token option.

## Pack the plugin

Run:

```bash
./scripts/package-wordpress-plugin.sh
```

This creates `dist/publisher-plugin.zip` when the plugin directory is present.
