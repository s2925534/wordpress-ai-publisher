import type { SiteConfig } from '@/lib/config-schemas';
import { redactSecrets } from '@/lib/error-utils';
import { decryptSecret } from '@/server/secret-utils';

type WordPressSiteRecord = {
  id: string;
  siteKey: string;
  siteUrl: string;
  encryptedPluginToken?: string | null;
  encryptedApplicationPassword?: string | null;
  username?: string | null;
  defaultStatus?: 'draft' | 'publish' | 'future' | 'pending' | 'private';
};

type WordPressFetch = typeof fetch;

export type WordPressDraftPayload = {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: 'draft' | 'publish' | 'future' | 'pending' | 'private';
  categories: number[];
  tags: string[];
  featuredMediaId?: number;
  author?: number;
};

export type WordPressMediaPayload = {
  url: string;
  altText: string;
  caption?: string;
  description?: string;
};

export type WordPressPublishResult = {
  postId: number;
  postUrl: string;
  status: string;
  socialStatus: 'skipped' | 'unavailable' | 'queued' | 'sent' | 'failed';
  socialErrorMessage?: string;
  jetpackStatus?: Record<string, unknown>;
};

export class WordPressService {
  constructor(
    private readonly deps: {
      fetchFn?: WordPressFetch;
    } = {}
  ) {}

  async getDiscovery(site: SiteConfig, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/discovery`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      headers: this.authHeaders(siteRecord)
    });
    return this.parseResponse(response);
  }

  async getJetpackStatus(site: SiteConfig, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/jetpack/status`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      headers: this.authHeaders(siteRecord)
    });
    return this.parseResponse(response);
  }

  async getSocialConnections(site: SiteConfig, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/jetpack/social-connections`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      headers: this.authHeaders(siteRecord)
    });
    return this.parseResponse(response);
  }

  async createCategory(site: SiteConfig, name: string, slug: string, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/categories`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: this.authHeaders(siteRecord),
      body: JSON.stringify({ name, slug })
    });
    return this.parseResponse(response);
  }

  async uploadMedia(site: SiteConfig, payload: WordPressMediaPayload, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/media`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: this.authHeaders(siteRecord),
      body: JSON.stringify(payload)
    });
    return this.parseResponse(response);
  }

  async createDraft(site: SiteConfig, payload: WordPressDraftPayload, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/posts`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: this.authHeaders(siteRecord),
      body: JSON.stringify(payload)
    });
    return this.parseResponse(response);
  }

  async updatePost(
    site: SiteConfig,
    postId: number,
    payload: Partial<WordPressDraftPayload>,
    siteRecord?: WordPressSiteRecord
  ) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/posts/${postId}`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      method: 'PATCH',
      headers: this.authHeaders(siteRecord),
      body: JSON.stringify(payload)
    });
    return this.parseResponse(response);
  }

  async publishPost(site: SiteConfig, postId: number, siteRecord?: WordPressSiteRecord) {
    const endpoint = new URL(`/wp-json/${site.plugin.routeNamespace}/posts/${postId}/publish`, site.siteUrl);
    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: this.authHeaders(siteRecord)
    });
    return this.parseResponse(response);
  }

  private get fetchFn() {
    return this.deps.fetchFn ?? fetch;
  }

  private authHeaders(siteRecord?: WordPressSiteRecord) {
    const token = decryptSecret(siteRecord?.encryptedPluginToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['x-publisher-token'] = token;
    }

    return headers;
  }

  private async parseResponse(response: Response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = redactSecrets(
        (payload as { error?: { message?: string } })?.error?.message ??
          `WordPress request failed with status ${response.status}`
      );
      throw new Error(message);
    }

    return payload;
  }
}
