import { NextRequest, NextResponse } from 'next/server';

import { AuthService, SESSION_COOKIE_NAME } from '@/server/auth-service';
import { exchangeCodeForTokens, fetchUserInfo, getOidcConfig } from '@/server/oidc-service';

const STATE_COOKIE = 'oidc_state';
const NONCE_COOKIE = 'oidc_nonce';

export async function GET(request: NextRequest) {
  const config = getOidcConfig();

  if (!config) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/login?error=oidc_state_mismatch', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    const userInfo = await fetchUserInfo(config, tokens.access_token);

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/login?error=oidc_missing_email', request.url));
    }

    const authService = new AuthService();
    const user = await authService.findOrCreateOidcUser(userInfo.email);
    const session = await authService.createSession(user.id);

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.APP_ENV === 'production',
      path: '/',
      expires: session.expiresAt
    });
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NONCE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=oidc_failed', request.url));
  }
}
