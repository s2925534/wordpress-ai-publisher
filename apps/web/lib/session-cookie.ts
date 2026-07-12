// Kept dependency-free (no node:crypto/Prisma imports) so it can be safely
// imported from Edge-runtime code such as middleware.ts, not just
// server/auth-service.ts.
export const SESSION_COOKIE_NAME = 'publisher_session';
