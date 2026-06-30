import { describe, expect, it } from 'vitest';

import { createDefaultSiteConfig } from '@/server/default-config';
import { encryptSecret } from '@/server/secret-utils';
import { WordPressService } from '@/server/wordpress-service';

describe('WordPressService', () => {
  it('calls the plugin discovery endpoint', async () => {
    const requests: Array<{ url: string; method?: string | undefined }> = [];
    const service = new WordPressService({
      fetchFn: async (input, init) => {
        requests.push({ url: input.toString(), method: init?.method });
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 });
      }
    });

    const result = await service.getDiscovery(createDefaultSiteConfig('https://example.com'));

    expect(result.data.ok).toBe(true);
    expect(requests[0]?.url).toContain('/wp-json/publisher/v1/discovery');
  });

  it('decrypts stored plugin tokens before sending requests', async () => {
    process.env.APP_ENCRYPTION_KEY = 'test-encryption-key-with-enough-length';
    const requests: Array<{ token?: string }> = [];
    const service = new WordPressService({
      fetchFn: async (_input, init) => {
        const headers = init?.headers as Record<string, string>;
        requests.push({ token: headers['x-publisher-token'] });
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 });
      }
    });

    await service.getDiscovery(createDefaultSiteConfig('https://example.com'), {
      id: 'site-1',
      siteKey: 'default-site',
      siteUrl: 'https://example.com',
      encryptedPluginToken: encryptSecret('plugin-token')
    });

    expect(requests[0]?.token).toBe('plugin-token');
  });
});
