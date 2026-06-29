import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ConfigService } from '@/server/config-service';
import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';

describe('ConfigService', () => {
  it('loads valid config files from disk', async () => {
    const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-config-'));
    mkdirSync(path.join(configDir, 'sites'));
    mkdirSync(path.join(configDir, 'content-profiles'));
    mkdirSync(path.join(configDir, 'global'));

    writeFileSync(
      path.join(configDir, 'sites', 'default-site.json'),
      JSON.stringify(createDefaultSiteConfig('https://example.com'))
    );
    writeFileSync(
      path.join(configDir, 'content-profiles', 'linkedin-blog-package.json'),
      JSON.stringify(createDefaultContentProfile())
    );

    const service = new ConfigService(configDir);
    const siteConfig = await service.loadSiteConfig('default-site');
    const profile = await service.loadContentProfile('linkedin-blog-package');

    expect(siteConfig.siteUrl).toBe('https://example.com');
    expect(profile.profileKey).toBe('linkedin-blog-package');
  });

  it('rejects invalid config files with file context', async () => {
    const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-config-invalid-'));
    mkdirSync(path.join(configDir, 'sites'));
    writeFileSync(
      path.join(configDir, 'sites', 'default-site.json'),
      JSON.stringify({ siteKey: 'default-site', siteName: 'Broken' })
    );

    const service = new ConfigService(configDir);

    await expect(service.loadSiteConfig('default-site')).rejects.toThrow('default-site.json');
  });
});
