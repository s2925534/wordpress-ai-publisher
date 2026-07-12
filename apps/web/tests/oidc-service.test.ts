import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  generateNonce,
  generateState,
  getOidcConfig
} from '@/server/oidc-service';

const DISCOVERY_DOCUMENT = {
  authorization_endpoint: 'https://auth.example.com/application/o/authorize/',
  token_endpoint: 'https://auth.example.com/application/o/token/',
  userinfo_endpoint: 'https://auth.example.com/application/o/userinfo/'
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => body } as Response;
}

describe('getOidcConfig', () => {
  it('returns null when SSO is disabled', () => {
    expect(
      getOidcConfig({
        ENABLE_OIDC_SSO: 'false',
        OIDC_ISSUER_URL: 'https://auth.example.com',
        OIDC_CLIENT_ID: 'id',
        OIDC_CLIENT_SECRET: 'secret',
        APP_URL: 'https://publisher.example.com'
      } as any)
    ).toBeNull();
  });

  it('returns null when enabled but required values are missing', () => {
    expect(
      getOidcConfig({
        ENABLE_OIDC_SSO: 'true',
        APP_URL: 'https://publisher.example.com'
      } as any)
    ).toBeNull();
  });

  it('builds a config with a fixed callback redirect URI when fully configured', () => {
    const config = getOidcConfig({
      ENABLE_OIDC_SSO: 'true',
      OIDC_ISSUER_URL: 'https://auth.example.com',
      OIDC_CLIENT_ID: 'id',
      OIDC_CLIENT_SECRET: 'secret',
      APP_URL: 'https://publisher.example.com'
    } as any);

    expect(config?.redirectUri).toBe('https://publisher.example.com/api/auth/oidc/callback');
  });
});

describe('generateState / generateNonce', () => {
  it('produce distinct, non-empty values each call', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe('OIDC discovery-backed flows', () => {
  const config = {
    issuerUrl: 'https://auth.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://publisher.example.com/api/auth/oidc/callback'
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('.well-known/openid-configuration')) {
          return jsonResponse(DISCOVERY_DOCUMENT);
        }
        if (url === DISCOVERY_DOCUMENT.token_endpoint) {
          return jsonResponse({ access_token: 'access-token-value', id_token: 'id-token-value' });
        }
        if (url === DISCOVERY_DOCUMENT.userinfo_endpoint) {
          return jsonResponse({ sub: 'user-1', email: 'person@example.com' });
        }
        return jsonResponse({}, false);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds an authorize URL pointing at the discovered authorization endpoint with state/nonce', async () => {
    const url = await buildAuthorizeUrl(config, 'state-value', 'nonce-value');
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(DISCOVERY_DOCUMENT.authorization_endpoint);
    expect(parsed.searchParams.get('client_id')).toBe('client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(parsed.searchParams.get('state')).toBe('state-value');
    expect(parsed.searchParams.get('nonce')).toBe('nonce-value');
    expect(parsed.searchParams.get('scope')).toBe('openid profile email');
  });

  it('exchanges a code for tokens via the discovered token endpoint', async () => {
    const tokens = await exchangeCodeForTokens(config, 'auth-code');
    expect(tokens.access_token).toBe('access-token-value');
  });

  it('fetches userinfo using the access token', async () => {
    const userInfo = await fetchUserInfo(config, 'access-token-value');
    expect(userInfo.email).toBe('person@example.com');
  });
});
