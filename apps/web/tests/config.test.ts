import { describe, expect, it } from 'vitest';

import {
  contentProfileSchema,
  siteConfigSchema
} from '@/lib/config-schemas';
import {
  createDefaultContentProfile,
  createDefaultSiteConfig
} from '@/server/default-config';

describe('config schemas', () => {
  it('loads a valid site config', () => {
    const parsed = siteConfigSchema.parse(createDefaultSiteConfig('https://example.com'));
    expect(parsed.siteUrl).toBe('https://example.com');
    expect(parsed.siteKey).toBe('default-site');
  });

  it('rejects an invalid site config', () => {
    expect(() =>
      siteConfigSchema.parse({
        siteKey: 'default-site',
        siteName: 'Example',
        wordpress: {}
      })
    ).toThrow();
  });

  it('loads a valid content profile', () => {
    const parsed = contentProfileSchema.parse(createDefaultContentProfile());
    expect(parsed.profileKey).toBe('linkedin-blog-package');
    expect(parsed.sections.linkedinPost.mustEndWithHashtags).toBe(true);
  });

  it('rejects an invalid content profile', () => {
    expect(() =>
      contentProfileSchema.parse({
        profileKey: 'linkedin-blog-package',
        name: 'Example'
      })
    ).toThrow();
  });
});
