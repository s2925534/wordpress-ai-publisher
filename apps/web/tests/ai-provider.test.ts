import { describe, expect, it } from 'vitest';

import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';
import { buildDefaultContentProfilePrompt } from '@/server/ai-prompt-builder';
import { MockAIProvider } from '@/server/ai-provider';

describe('AI provider foundation', () => {
  it('builds a config-driven prompt with source safety guidance', () => {
    const prompt = buildDefaultContentProfilePrompt({
      inputText: 'Rough notes about content generation and structured publishing.',
      sourceSafetyType: 'third_party_text',
      siteConfig: createDefaultSiteConfig('https://example.com'),
      contentProfile: createDefaultContentProfile()
    });

    expect(prompt).toContain("Do not copy or closely paraphrase another author's distinctive wording");
    expect(prompt).toContain('LinkedIn + WordPress Blog Package');
    expect(prompt).toContain('https://example.com');
  });

  it('returns a validated mock publication package', async () => {
    const provider = new MockAIProvider();
    const packageResult = await provider.generatePublicationPackage({
      inputText: 'Draft notes about practical content generation for WordPress publishing.',
      sourceSafetyType: 'notes_only',
      siteConfig: createDefaultSiteConfig('https://example.com'),
      contentProfile: createDefaultContentProfile()
    });

    expect(packageResult.title).toMatch(/Draft Notes About Practical/);
    expect(packageResult.seoPackage.slug).toBeTruthy();
    expect(packageResult.sourceSafetyType).toBe('notes_only');
    expect(packageResult.recommendedCategories).toHaveLength(1);
  });
});
