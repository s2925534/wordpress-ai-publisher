# Authentication

Every page and API route requires a signed-in session, except `/login` (and its supporting
`/api/auth/*` routes) and `/api/health` (polled by deploy/Watchtower health checks — see
`../synology-site-deployer`'s `--health-path` flag). This app ships two sign-in modes:

1. **Local username/password** — always available, zero external dependency. This is the default
   so the app is fully usable standalone by anyone who self-hosts it.
2. **OIDC SSO** — optional, disabled by default. Lets you sign in against any standard OIDC
   provider (e.g. a self-hosted authentik instance such as `../nas-sso-gateway`) instead of/
   alongside local login.

## Local Login

- The first account is bootstrapped automatically on first container boot from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` in `.env` (see `apps/web/server/bootstrap-admin.ts`, run via
  `docker-entrypoint.sh` after migrations) — only when the `User` table is empty. It is a no-op on
  every later boot once any user exists, so these two env vars don't need to stay set (or correct)
  after the first successful login.
- Passwords are hashed with `scrypt` (`apps/web/server/auth-service.ts`) — a random salt per
  password, verified with a constant-time comparison. No plaintext password is ever stored.
- Sessions are DB-backed (`Session` model, 30-day expiry), identified by an opaque, httpOnly,
  `sameSite=lax` cookie (`publisher_session`). Logging out (`POST /api/auth/logout`) deletes the
  session row and clears the cookie.

## Optional OIDC SSO

Enable by setting in `.env`:

```
ENABLE_OIDC_SSO=true
OIDC_ISSUER_URL=https://auth.example.com/application/o/<app-slug>/
OIDC_CLIENT_ID=<client id from your OIDC provider>
OIDC_CLIENT_SECRET=<client secret from your OIDC provider>
```

- **Redirect URI is fixed, not configurable:** always `${APP_URL}/api/auth/oidc/callback`. Register
  exactly that URL as the allowed redirect URI on the provider side.
- **Scopes requested:** `openid profile email`.
- **Discovery:** the issuer's `/.well-known/openid-configuration` is fetched at runtime (cached in
  memory) to find the authorize/token/userinfo endpoints — no provider-specific code, works with
  any spec-compliant OIDC provider, not just authentik.
- **User matching:** on a successful callback, a local `User` row is matched (or created) by the
  `email` claim from the userinfo endpoint. There is no separate "link an SSO identity to an
  existing local account" step — same email, same account.
- **CSRF protection:** a random `state` value is stored in a short-lived httpOnly cookie before
  redirecting to the provider, and checked for an exact match on callback. The `nonce` is generated
  and sent but not currently verified against the ID token's claims (this app uses the userinfo
  endpoint, backed by the access token, rather than decoding/verifying the ID token's signature
  directly — a reasonable simplification, but a follow-up if you need full ID-token verification).
- **Client secret storage:** `.env` only, never committed, same as every other secret in this app.

If SSO is ever unreachable or misconfigured, local login is unaffected — it's a genuinely separate
path, not a fallback that depends on OIDC working. Disabling `ENABLE_OIDC_SSO` and redeploying is
the full rollback.

## Middleware Scope (What It Does and Doesn't Check)

`apps/web/middleware.ts` runs on Next.js's Edge runtime, which can't use Prisma/`node:crypto` — so
it only checks whether the session cookie is *present*, not whether it's still valid (unexpired,
not-yet-logged-out). That means:

- Anonymous requests (no cookie at all) are always blocked at the edge — the main gap this closes.
- A cookie from an *already-expired or already-logged-out* session is not rejected by the
  middleware itself; full validation happens wherever a route actually calls
  `AuthService.getSessionUser()`. No existing route does this today (out of scope for this pass) —
  a route that needs to know *who* is signed in, not just *that* someone is, should call it.
- Tightening this (e.g. Next's experimental Node-runtime middleware, once stable) is a reasonable
  future hardening step, not done here to avoid depending on an experimental Next.js feature.
