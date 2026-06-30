# Security

The app uses a split configuration model:

- `.env` holds process-level values such as app secrets, database connection strings, and AI provider defaults.
- The database holds site-specific credentials such as the WordPress username, application password, and plugin token.
- JSON config files hold site-specific behavior such as the site URL, brand voice, and publishing preferences.

Secrets are never returned to the browser. Stored credentials are encrypted before persistence, and server-side validation is applied before any external request is made.
