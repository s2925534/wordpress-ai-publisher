# TODO — AI content generation produces echoed prompts instead of real content

## STATUS: FIXED AND DEPLOYED (2026-07-09)

All items below were implemented, tested against the real OpenAI API, and deployed:

- Fixed all 4 issues below (OpenAIProvider wiring, mock echo, article content
  field, JSON hardening) plus a `temperature` param real gpt-5.5 rejects, and
  non-conforming slugs from the model -- see commits on `main` from
  2026-07-09 (`fix: wire real OpenAI generation and add Docker deployment`
  onward).
- Verified live against the real OpenAI API locally: "write a post about
  computer programming" now returns a full original article, no echo.
- Also found and fixed a real bug surfaced along the way: `/dashboard`,
  `/settings`, `/site-discovery`, `/new-package` were being statically
  prerendered at build time (baking in build-time DB state) instead of
  rendered per-request -- added `export const dynamic = 'force-dynamic'`.
- Deployed to a subdomain (e.g. `https://app.example.com` -- see `CLAUDE.md`
  for the actual current deployment target, not committed here since this
  repo is generic/reusable), registry-based (GHCR +
  `.github/workflows/docker-publish.yml`), with the NAS's existing
  Watchtower auto-pulling `:latest` on every push to `main` -- no manual
  redeploy needed for future changes.
- Remaining action for you: open Settings on the deployed site and enter an
  OpenAI API key + your WordPress site connection -- this is a fresh
  install with its own empty database, separate from local dev.
- Not addressed (out of scope for this pass): GitHub flagged 7 Dependabot
  vulnerabilities (2 critical, 1 high, 4 moderate) on the repo -- worth a
  separate look, unrelated to the generation bug.

## Investigation summary (2026-07-09)

Reported symptom: asking for e.g. "write a post about computer programming" returns
output where that same instruction text is injected back as if it were the article
content, instead of the AI actually writing a post about computer programming.

Root cause confirmed by static code reading (no code changed, no live OpenAI calls
made — no `OPENAI_API_KEY` is configured anywhere in this repo, see below). Two
stacked bugs plus one design gap explain the behavior end to end.

### 1. `OpenAIProvider` is fully implemented but never used anywhere at runtime — **critical**
- `apps/web/server/ai-provider.ts:252` defines `OpenAIProvider`, a real implementation
  that calls the OpenAI Chat Completions / Images APIs.
- Nothing outside the test suite ever constructs `new OpenAIProvider(...)`. Grep
  confirms zero runtime references (`tests/ai-provider.test.ts` is the only file
  that instantiates it).
- `PackageService` (`apps/web/server/package-service.ts:41`) and `GenerationService`
  (`apps/web/server/generation-service.ts:23`) both hardcode
  `deps.aiProvider ?? new MockAIProvider()` as the default, and every API route
  (`app/api/packages/generate/route.ts`, `app/api/packages/[packageId]/image/route.ts`,
  `app/api/packages/[packageId]/route.ts`, `.../publish/route.ts`) constructs the
  service with **no `aiProvider` override at all**.
- Meanwhile Settings (`apps/web/app/settings/settings-client.tsx:212`,
  `apps/web/server/settings-service.ts:80-136`) has a full UI + encrypted storage
  for `openAiApiKey` / `openAiTextModel` / `openAiImageModel`, and even marks the
  field "invalid" if it's empty — implying to the user that it's required and used.
  It is saved but **never read back to build a provider**.
- Net effect: **every generation request always uses `MockAIProvider`**, regardless
  of whether an OpenAI key is configured. No real AI call is ever made today.

### 2. `MockAIProvider` echoes the raw input text back as "content" for non-trivial requests — **critical (this is what the user is actually seeing)**
- `MockAIProvider.buildExcerpt` (`apps/web/server/ai-provider.ts:205-213`) and
  `generateSeoPackage`'s `metaDescription` (`apps/web/server/ai-provider.ts:82-98`)
  both fall back to `summarizeText(input.inputText, N)` for anything that isn't
  parsed as a "joke" request.
- `summarizeText` (`apps/web/lib/text-utils.ts:64-71`) does **not** summarize —
  it just truncates to the first N words and appends `...` if longer. For a short
  instruction like `"write a post about computer programming"` (7 words, under the
  24–28 word cutoff), it returns the string **verbatim, unchanged**.
- So the excerpt and SEO meta description literally become the user's own typed
  instruction. Only `title` and `linkedinPost` go through
  `parseTaskInstruction`/`buildTitle`, which extracts the topic — everything else
  (excerpt, meta description, search intent summary) does not, so it's inconsistent
  even within the mock.
- `MockAIProvider` was always intended as a placeholder/test double
  (`docs/AI_PROFILE.md`: *"AI provider integration is intentionally absent from
  Phase 1"*), not as production content generation — but because of bug #1 it is
  what actually runs in production today.

### 3. No distinct long-form article body field — **design gap, will still bite after #1/#2 are fixed**
- `publicationPackageSchema` (`apps/web/lib/ai-schemas.ts:36-48`) only has `title`,
  `linkedinPost`, and `excerpt` as text fields. There is no `content`/`body` field
  for a full WordPress article.
- `PackageService.publish()` (`apps/web/server/package-service.ts:250-263`) sends
  `content: record.linkedinPost` to WordPress — i.e. **the WordPress post body is
  the short LinkedIn-style post**, not a full article.
- Even once real AI generation is wired up correctly, "write a post about X" will
  publish a short LinkedIn-length post as the entire WordPress post content unless
  this is addressed. Worth confirming with the user whether this is intentional
  (a "social snippet" tool) or whether a real article body is expected — the
  reported request ("write a post about computer programming") suggests the latter.

### 4. Latent robustness risk in `OpenAIProvider` once it's actually wired up
- `requestText` (`apps/web/server/ai-provider.ts:327-355`) does not pass
  `response_format: { type: 'json_object' }` and does not strip markdown code
  fences before `JSON.parse(raw)`. GPT chat models frequently wrap JSON replies in
  ```` ```json ... ``` ```` even when asked for "strict JSON", which will throw on
  `JSON.parse`. This will surface as a 500 the first time someone enables the real
  provider unless handled.
- The recent commit `ca7d76b` ("fix: distinguish generation prompts from source
  text") correctly added `inputMode` handling to `buildDefaultContentProfilePrompt`
  and to `MockAIProvider.buildTitle`/`buildLinkedInPost`, but since bug #1 means
  `OpenAIProvider` never runs, that fix has had **no effect on production
  behavior** — it only improved the mock's title/LinkedIn-post generation and the
  unused real-provider prompt.

## Why I didn't make live OpenAI calls
No `OPENAI_API_KEY` exists in `.env`/`.env.example`, `server/env.ts`'s schema
doesn't even define one (it's only stored per-install via the encrypted Settings
DB row), and `node_modules` isn't installed. The root cause was fully reproducible
by reading `summarizeText`/`MockAIProvider` directly, so no API credits were spent
confirming it. Recommend testing with a real key only after fix #1 below lands.

## Recommended fixes, in order

- [ ] **Critical — wire `OpenAIProvider` into the real request path.** In
      `PackageService`/`GenerationService`, when settings has a configured OpenAI
      key (`SettingsService.getSettings()`), construct
      `new OpenAIProvider({ apiKey, textModel, imageModel })` instead of always
      defaulting to `MockAIProvider`. Fall back to `MockAIProvider` only when no
      key is configured (and ideally show that state in the UI, e.g. a banner on
      `new-package` saying "using mock content — add an OpenAI key in Settings").
- [ ] **Critical — decide `MockAIProvider`'s job and fix the echo.** Either (a)
      make `buildExcerpt`/`generateSeoPackage` route through the same
      `parseTaskInstruction` topic extraction that `buildTitle` uses instead of
      `summarizeText(inputText, ...)`, so the mock never echoes the literal
      instruction, or (b) since fix #1 makes the mock a true test-only fallback,
      just make it obviously synthetic (e.g. prefix with "[mock]") so nobody
      mistakes it for real generated content again.
- [ ] **High — add a real article body field.** Add `content`/`articleBody` to
      `publicationPackageSchema`, generate it distinctly from `linkedinPost`, and
      publish that (not `linkedinPost`) as the WordPress post content in
      `PackageService.publish()`. Confirm with product intent first — see gap #3.
- [ ] **High — harden `OpenAIProvider.requestText` JSON parsing.** Pass
      `response_format: { type: 'json_object' }` for the JSON-producing calls, and/or
      strip ` ```json ` fences before `JSON.parse`, with a clear error surfaced if
      parsing still fails (currently it would throw a raw `SyntaxError`).
- [ ] **Medium — surface provider state in Settings UI.** Since `openAiKeyConfigured`
      is already tracked, add a visible indicator on the generation page (not just
      Settings) showing whether generation will use the real model or the mock, so
      this class of bug is obvious next time instead of silently degrading.
- [ ] **Low — test coverage.** `tests/generation-service.test.ts` /
      `tests/package-service.test.ts` should include a case that injects a real
      `OpenAIProvider` (with a fetch mock) through `PackageService`/`GenerationService`
      to prove the wiring in fix #1 actually happens, not just that `MockAIProvider`
      behaves correctly in isolation (which is all `tests/ai-provider.test.ts`
      currently proves).

---

## TODO — Authentication (Local Credentials + Optional SSO) (added 2026-07-12)

Every route today — `/`, `/dashboard`, `/settings`, `/site-discovery`, `/new-package`,
`/packages/[id]`, and all `/api/*` except `/api/health` — is completely unauthenticated. Anyone who
can reach the container can read/write the configured OpenAI key and WordPress credentials via
`/api/settings`. This needs fixing, but this app is meant to be usable two ways: standalone by
anyone who self-hosts it with no dependency on any particular identity provider, and behind the
maintainer's own SSO gateway (`../nas-sso-gateway`, authentik). So auth needs two modes: a local
username/email/password login that always works with zero external dependency, and an optional
OIDC login (against authentik or any other OIDC provider) that can be turned on via env vars
without being required.

- [x] **Critical — add a `User` model + migration.** Added `User`/`Session` models
      (`apps/web/prisma/schema.prisma`, migration `20260712222131_add_user_and_session`) and
      `apps/web/server/auth-service.ts`. Used Node's built-in `crypto.scrypt` (random salt,
      constant-time compare) instead of adding an argon2/bcrypt dependency — this codebase already
      uses raw `node:crypto` in `secret-utils.ts`, so this avoids a new native-module dependency.
- [x] **Critical — local login routes + bootstrap admin.** `/login` page + `/api/auth/login` /
      `/api/auth/logout`. `apps/web/server/bootstrap-admin.ts` seeds the first user from
      `ADMIN_EMAIL`/`ADMIN_PASSWORD` (only when the `User` table is empty), wired into
      `docker-entrypoint.sh` after `prisma migrate deploy`. Added `ADMIN_EMAIL`/`ADMIN_PASSWORD` to
      `.env.example` — no `SESSION_SECRET` needed in the end: sessions are DB-backed
      (`Session` model) with an opaque cookie ID, not a signed/stateless token.
- [x] **Critical — optional OIDC SSO, env-gated and off by default.** `ENABLE_OIDC_SSO` (default
      `false`), `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` in `env.ts` (`superRefine`
      requires the three OIDC_* vars only when enabled). `apps/web/server/oidc-service.ts` does
      `.well-known/openid-configuration` discovery + authorization-code flow with `fetch` (no new
      dependency — works with any spec-compliant provider, not authentik-specific).
      `/api/auth/oidc/login` + `/api/auth/oidc/callback`, `state` validated via cookie match.
      `/login` shows "Sign in with SSO" only when enabled. `nonce` is generated/sent but not
      verified against the ID token (userinfo endpoint is used instead of decoding the ID token —
      see `docs/AUTHENTICATION.md` for the trade-off).
- [x] **High — protect every route with middleware.** `apps/web/middleware.ts` gates everything
      except `/login`, `/api/auth/*`, `/api/health`. Real bug hit and fixed while building this:
      middleware runs on the Edge runtime, which can't load `node:crypto` — importing
      `SESSION_COOKIE_NAME` from `auth-service.ts` broke the production build
      (`next build` failed with `UnhandledSchemeError` on `node:crypto`) until the constant was
      moved to a dependency-free `apps/web/lib/session-cookie.ts`. Confirmed fixed via a real
      `next build` (middleware bundled at 34.2 kB, build succeeds). Note: middleware only checks
      cookie *presence*, not DB-backed expiry (Prisma isn't available on the Edge runtime either) —
      see the "Middleware Scope" section in `docs/AUTHENTICATION.md`.
- [ ] **High — middleware test coverage.** Not done — Next.js middleware integration testing (vs.
      unit-testing the service layer, which is covered below) needs either a running dev server or
      Next's own test harness; left as a follow-up rather than faking it with a shallow test.
- [x] **Medium — document both auth modes.** Added `docs/AUTHENTICATION.md` (both modes, issuer
      URL format, fixed callback path, scopes, client secret storage, middleware scope/limitations)
      and updated `docs/SECURITY.md`'s auth description.
- [x] **Low — auth-service/oidc-service unit tests.** `tests/auth-service.test.ts` (7 tests) and
      `tests/oidc-service.test.ts` (7 tests) added. Full suite verified green: `npm run typecheck`,
      `npm run lint`, `npm run test` (66/66 passing), and `npm run build` all pass for real.
