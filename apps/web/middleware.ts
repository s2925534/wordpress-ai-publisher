import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const PUBLIC_PATHS = ['/login', '/api/health'];

// Edge-runtime gate: checks for the session cookie's presence only (Prisma/
// SQLite isn't available on the Edge runtime middleware runs on). Full
// expiry/validity checks happen wherever a route actually loads the session
// user via AuthService.getSessionUser -- see docs/AUTHENTICATION.md.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
