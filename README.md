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

## Quick start

Run:

```bash
./scripts/quick-start.sh
```

The script asks only for your WordPress site URL, creates local config files, installs dependencies when needed, runs Prisma setup, validates config, and starts the dev server.

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
