# WordPress AI Publishing Assistant

A local-first WordPress AI publishing assistant for turning rough notes into a reviewed WordPress and LinkedIn publication package.

The project is generic by design. Site-specific behavior belongs in the app configuration, JSON config files, or database records, not hard-coded application logic.

## License

MIT License. Provided free of charge, without warranty.

## Developer Information

- Developer: Pedro Veloso
- Email: `pedro@veloso.dev`
- Project remote: `https://github.com/s2925534/wordpress-ai-publisher.git`

## What It Does

- Stores setup in the web UI instead of requiring per-site `.env` variables.
- Lets the user configure OpenAI, WordPress site details, WordPress credentials, and plugin token from Settings.
- Supports browser-side encrypted configuration storage with JSON export/import backup.
- Discovers WordPress site structure through the custom plugin where available.
- Retrieves and displays categories, tags, authors, recent posts, media settings, and Jetpack status where available.
- Generates a WordPress + LinkedIn publication package from rough notes.
- Generates SEO fields, category/tag recommendations, image prompts, image filename, and mandatory alt text.
- Supports AI safeguard profiles that guide how prompts are interpreted during generation.
- Shows generated content in clearly highlighted review cards.
- Supports multi-select category/tag chips with removable selections.
- Previews generated images, supports `Try another image`, and opens a large overlay preview when the image is clicked.
- Requires explicit confirmation before creating a WordPress draft, publishing, or scheduling.
- Defaults to WordPress draft creation.
- Keeps WordPress publishing independent from Jetpack Social availability.
- Uses idempotency protection to avoid duplicate publishing attempts.

## What It Does Not Do

- No multi-tenant SaaS.
- No billing.
- No team/user management.
- No direct LinkedIn, Instagram, Facebook, X, Threads, TikTok, or other social API integrations.
- No social scraping.
- No autonomous publishing.
- No publishing without explicit confirmation.
- No committed secrets.

## Quick Start

Run:

```bash
./scripts/quick-start.sh
```

Then open:

```text
http://localhost:3000
```

The quick-start script prepares the local app, installs dependencies when needed, runs Prisma setup, validates config, packages the WordPress plugin when possible, and starts the dev server.

Current setup is handled in the web UI. The quick-start script should not be used to collect OpenAI keys, WordPress usernames, WordPress passwords, categories, tags, brand voice, or plugin tokens.

## App Setup Flow

1. Open `Settings`.
2. Configure the AI provider and model selections.
3. Add your OpenAI API key.
4. Configure the WordPress protocol, hostname, timezone, username, and application password.
5. Download the WordPress plugin zip from Settings.
6. Install and activate the plugin in WordPress.
7. Generate a plugin token in Settings.
8. Use `Open plugin settings with token` to prefill the token in WordPress.
9. Click Save in WordPress plugin settings.
10. Save settings in the app.
11. Run Site Discovery.
12. Create a new package.

## Configuration Model

`.env` is generic and process-level only. It should hold local app runtime values such as:

- `APP_URL`
- `APP_ENV`
- `APP_SECRET`
- `APP_ENCRYPTION_KEY`
- `DATABASE_URL`
- default config keys
- runtime feature toggles

The following should be configured in the web UI, not hard-coded into `.env`:

- OpenAI API key
- OpenAI text/image model choice
- WordPress domain
- WordPress username
- WordPress application password
- WordPress plugin token
- timezone

The browser also keeps an encrypted local configuration draft. Use the Settings screen to download a JSON backup and import it later if browser storage is cleared.

JSON config files under `config/` provide generic defaults and content profile rules. They should not contain secrets.

## WordPress Plugin

The custom plugin lives in:

```text
wordpress-plugin/publisher-plugin
```

The app can package and serve the plugin zip from Settings. You can also build it manually:

```bash
./scripts/package-wordpress-plugin.sh
```

Upload:

```text
dist/publisher-plugin.zip
```

In WordPress Admin:

1. Go to `Plugins -> Add New Plugin`.
2. Upload `dist/publisher-plugin.zip`.
3. Activate the plugin.
4. Go to `Settings -> AI Publisher`.
5. Paste or prefill the plugin token.
6. Click Save.

The app provides an `Open plugin settings with token` link. It passes the token in the URL fragment so the token is not sent to WordPress during page load. WordPress still requires an admin user to click Save.

Reinstall the plugin only when plugin files change. Pure app UI changes do not require reinstalling the WordPress plugin.

## Content Generation Workflow

1. Go to `New Package`.
2. Paste at least 20 characters of rough notes or source material.
3. Choose the source safety type.
4. Review or edit the selected AI safeguard if needed.
5. Click `Generate package`.
6. Review the generated package preview.
7. Open final confirmation.
8. Edit title, LinkedIn post, excerpt, tags, SEO fields, alt text, and filename.
9. Prepare a featured image.
10. Click the image to inspect it in a larger overlay.
11. Use `Try another image` if the image is not suitable.
12. Confirm the final action.
13. Create a WordPress draft by default, or explicitly choose publish/schedule.

## AI Safeguards

AI safeguards are reusable generation rules. They are available in Settings and as a popup on the New Package screen. Both locations edit the same saved configuration.

The built-in default safeguard is readonly. It tells the generator to treat task-style prompts as instructions. For example, `Write a joke about Australia` should generate the joke package, not produce a title or excerpt about the literal sentence.

Create custom safeguards for different post types, such as jokes, technical posts, announcements, or long-form articles. Custom safeguards are saved with the browser configuration JSON and persisted through the local settings API.

## Validation And Warnings

The UI highlights invalid or incomplete fields:

- Rough notes turn red below the 20-character minimum.
- Required editor fields turn red if emptied.
- Alt text turns red when an image exists but alt text is invalid.
- SEO warnings and alt text validation cards turn red when they contain actionable warnings.
- Missing required settings are outlined and labeled.

Warnings are intended to make the review workflow obvious before publishing.

## Publishing Safety

- Draft is the default WordPress status.
- Publishing and scheduling require explicit confirmation.
- New category creation requires confirmation.
- Featured images require alt text before assignment.
- Duplicate publish attempts are protected with idempotency keys.
- Jetpack Social failures do not block WordPress draft creation.

## Available Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run prisma:migrate
npm run prisma:seed
npm run config:validate
```

Commit successful work with:

```bash
./scripts/commit-success.sh "type: clear commit message"
```

The commit helper runs lint, typecheck, tests, and config validation. It refuses obvious secret files and pushes when a remote is configured.

## Repository Structure

```text
apps/web                Next.js app
wordpress-plugin        Custom WordPress plugin
config                  Generic JSON defaults and content profiles
scripts                 Setup, validation, packaging, and commit helpers
docs                    Architecture, security, plugin, testing, AI, and deployment docs
```

## Development Notes

- Keep `.env` generic.
- Do not commit `.env`, local databases, generated secrets, build output, or logs.
- Keep site-specific behavior in JSON config or database records.
- Keep direct social platform integrations out of the MVP.
- Mock external API calls in tests.
- Reinstall the WordPress plugin only when plugin source changes.
