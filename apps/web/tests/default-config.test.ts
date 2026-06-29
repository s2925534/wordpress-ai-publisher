import { describe, expect, it } from 'vitest';

import {
  createDefaultContentProfile,
  createDefaultSiteConfig
} from '@/server/default-config';

describe('default config builders', () => {
  it('normalizes the site name from the site url', () => {
    const config = createDefaultSiteConfig('https://blog.example.com');
    expect(config.siteName).toBe('Blog');
    expect(config.siteUrl).toBe('https://blog.example.com');
  });

  it('returns the generic content profile key', () => {
    const profile = createDefaultContentProfile();
    expect(profile.profileKey).toBe('linkedin-blog-package');
  });
});
