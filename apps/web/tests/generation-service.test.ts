import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GenerationService } from '@/server/generation-service';
import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';

function createConfigDir() {
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-generation-'));
  const siteDir = path.join(configDir, 'sites');
  const profileDir = path.join(configDir, 'content-profiles');
  mkdirSync(siteDir, { recursive: true });
  mkdirSync(profileDir, { recursive: true });

  writeFileSync(
    path.join(siteDir, 'default-site.json'),
    JSON.stringify(createDefaultSiteConfig('https://example.com'))
  );
  writeFileSync(
    path.join(profileDir, 'linkedin-blog-package.json'),
    JSON.stringify(createDefaultContentProfile())
  );

  return configDir;
}

describe('GenerationService', () => {
  it('generates a validated publication package from rough notes', async () => {
    const service = new GenerationService(createConfigDir());
    const result = await service.generatePackage({
      inputText:
        'These notes describe a practical content workflow for WordPress publishing, SEO validation, and repeatable output.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    expect(result.title).toContain('These Notes Describe');
    expect(result.sourceSafetyType).toBe('notes_only');
    expect(result.seoPackage.slug).toBeTruthy();
    expect(result.recommendedCategories.length).toBeGreaterThan(0);
    expect(result.plainCsvTags).toContain(',');
  });

  it('falls back to the default config when the requested config is unavailable', async () => {
    const service = new GenerationService(createConfigDir());
    const result = await service.generatePackage({
      inputText: 'Fallback generation should still succeed with the default config.',
      sourceSafetyType: 'my_own_text'
    });

    expect(result.title).toBeTruthy();
    expect(result.seoPackage.readinessScore).toBeGreaterThanOrEqual(0);
  });
});
