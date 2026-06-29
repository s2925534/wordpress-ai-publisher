import { describe, expect, it } from 'vitest';

import { createDefaultSiteConfig } from '@/server/default-config';
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
});
