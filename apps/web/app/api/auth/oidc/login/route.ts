import { NextResponse } from 'next/server';

import { buildAuthorizeUrl, generateNonce, generateState, getOidcConfig } from '@/server/oidc-service';

const STATE_COOKIE = 'oidc_state';
const NONCE_COOKIE = 'oidc_nonce';

export async function GET() {
  const config = getOidcConfig();

  if (!config) {
    return NextResponse.json(
      { success: false, error: { code: 'oidc_disabled', message: 'SSO sign-in is not enabled.' } },
      { status: 404 }
    );
  }

  const state = generateState();
  const nonce = generateNonce();
  const authorizeUrl = await buildAuthorizeUrl(config, state, nonce);

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.APP_ENV === 'production',
    path: '/',
    maxAge: 300
  };
  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  response.cookies.set(NONCE_COOKIE, nonce, cookieOptions);
  return response;
}
