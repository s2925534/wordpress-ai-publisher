# WordPress AI Publishing Assistant

Phase 1 foundation for a generic WordPress AI publishing assistant.

## License

MIT License. Provided free of charge, without warranty.

## Developer Information

- Developer: Pedro Veloso
- Email: `pedro@veloso.dev`
- Project remote: `https://github.com/s2925534/wordpress-ai-publisher.git`

## Current Scope

Phase 2 added the Prisma data model, a settings dashboard, a settings screen, and a default content profile seed.

Phase 3 added the WordPress plugin scaffold and REST endpoint structure.

Phase 4 adds WordPress site discovery, cached discovery snapshots, and a refreshable discovery UI.

Phase 5 adds the AI provider foundation, validated publication package schemas, and a basic package generator UI.

Phase 6 adds deterministic category and tag recommendation, duplicate detection, and new category suggestions.

Phase 7 adds featured image preparation, alt text validation, and image filename handling.

Phase 8 adds stored publication packages, draft creation, media upload handling, and idempotency protection.

Phase 9 adds Jetpack status fallback handling in the publishing flow.

Phase 10 adds explicit publish and schedule actions through the final confirmation screen.

Phase 11 adds logging, validation, and workflow hardening around the publishing pipeline.

## Configuration model

- `.env` is for process-level values: app secrets, database URL, and runtime feature toggles.
- The settings screen is the primary setup surface for the site URL, protocol, timezone, AI provider, AI models, OpenAI API key, and WordPress credentials.
- The browser keeps an encrypted JSON backup of the current setup so the user can export and import configuration.
- Site-specific behavior still has JSON defaults under `config/`, but the UI-backed setup is the editable source of truth.

## Quick start

Run:

```bash
./scripts/quick-start.sh
```

The script creates the generic local scaffold, installs dependencies when needed, runs Prisma setup, validates config, and starts the dev server. Setup now happens in the app UI, where you can also export and import an encrypted JSON backup of the current configuration.

## Available commands

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

## What is in Phase 1

- Next.js app shell
- TypeScript strict mode
- Tailwind CSS baseline
- shadcn-style UI primitives
- Prisma and SQLite scaffold
- Zod config validation
- Health endpoint
- Quick start and commit helper scripts
- Generic JSON config directory

## What is not in Phase 1

- AI generation
- WordPress publishing
- Jetpack integration
- Category matching
- Media upload
- Social publishing
