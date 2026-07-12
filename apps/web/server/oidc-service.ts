import { randomBytes } from 'node:crypto';

export type OidcConfig = {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type DiscoveryDocument = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

type TokenResponse = {
  access_token: string;
  id_token?: string;
};

type UserInfoResponse = {
  email?: string;
  sub: string;
};

let discoveryCache: { issuerUrl: string; doc: DiscoveryDocument } | null = null;

export function getOidcConfig(env: NodeJS.ProcessEnv = process.env): OidcConfig | null {
  if (env.ENABLE_OIDC_SSO !== 'true') {
    return null;
  }

  const issuerUrl = env.OIDC_ISSUER_URL;
  const clientId = env.OIDC_CLIENT_ID;
  const clientSecret = env.OIDC_CLIENT_SECRET;
  const appUrl = env.APP_URL;

  if (!issuerUrl || !clientId || !clientSecret || !appUrl) {
    return null;
  }

  return {
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri: new URL('/api/auth/oidc/callback', appUrl).toString()
  };
}

async function discover(issuerUrl: string): Promise<DiscoveryDocument> {
  if (discoveryCache?.issuerUrl === issuerUrl) {
    return discoveryCache.doc;
  }

  const base = issuerUrl.endsWith('/') ? issuerUrl : `${issuerUrl}/`;
  const wellKnownUrl = new URL('.well-known/openid-configuration', base).toString();
  const response = await fetch(wellKnownUrl);
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status}`);
  }

  const doc = (await response.json()) as DiscoveryDocument;
  discoveryCache = { issuerUrl, doc };
  return doc;
}

export function generateState() {
  return randomBytes(16).toString('hex');
}

export function generateNonce() {
  return randomBytes(16).toString('hex');
}

export async function buildAuthorizeUrl(config: OidcConfig, state: string, nonce: string) {
  const doc = await discover(config.issuerUrl);
  const url = new URL(doc.authorization_endpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

export async function exchangeCodeForTokens(config: OidcConfig, code: string): Promise<TokenResponse> {
  const doc = await discover(config.issuerUrl);
  const response = await fetch(doc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`OIDC token exchange failed: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function fetchUserInfo(config: OidcConfig, accessToken: string): Promise<UserInfoResponse> {
  const doc = await discover(config.issuerUrl);
  const response = await fetch(doc.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`OIDC userinfo fetch failed: ${response.status}`);
  }

  return (await response.json()) as UserInfoResponse;
}
