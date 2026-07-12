# Security

The app uses a split configuration model:

- `.env` holds process-level values such as app secrets, database connection strings, and runtime feature toggles.
- The settings screen is the editable source of truth for site-specific setup, including the OpenAI API key.
- The browser stores an encrypted JSON backup of the current setup so the user can export and restore it later.
- The database holds site credentials and persisted settings for runtime use.
- JSON config files hold safe defaults and content profiles.

Secrets are never returned to the browser. Stored credentials are encrypted before persistence, and server-side validation is applied before any external request is made.

## Authentication

Every page and API route (except `/login` and `/api/health`) requires a signed-in session — see
[`docs/AUTHENTICATION.md`](AUTHENTICATION.md) for the two supported sign-in modes (local
username/password, always available; optional OIDC SSO) and how sessions/passwords are stored.
