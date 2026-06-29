import { describe, expect, it } from 'vitest';

import { generationRequestSchema, generatedPackageResponseSchema } from '@/lib/generation-schemas';

describe('generation schemas', () => {
  it('validates generation requests', () => {
    const parsed = generationRequestSchema.parse({
      inputText: 'This is enough text to pass validation for generation.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    expect(parsed.sourceSafetyType).toBe('notes_only');
  });

  it('rejects short generation input', () => {
    expect(() =>
      generationRequestSchema.parse({
        inputText: 'Too short',
        sourceSafetyType: 'unknown'
      })
    ).toThrow();
  });

  it('validates generated package responses', () => {
    const parsed = generatedPackageResponseSchema.parse({
      title: 'Example Title',
      linkedinPost: 'Example post.\n\n#One #Two',
      excerpt: 'Example excerpt.',
      plainCsvTags: 'one, two',
      recommendedCategories: [
        { name: 'General', slug: 'general', confidence: 'none', reason: 'Fallback recommendation' }
      ],
      recommendedTags: ['one', 'two'],
      featureImagePrompt: null,
      altText: 'An example alt text.',
      suggestedImageFileName: 'example-title',
      seoPackage: {
        seoTitle: 'Example Title',
        slug: 'example-title',
        metaDescription: 'Example meta description.',
        primaryKeyword: 'Example',
        secondaryKeywords: ['one'],
        searchIntentSummary: 'Readers want an example.',
        readinessScore: 70,
        warnings: [],
        internalLinkSuggestions: []
      },
      sourceSafetyType: 'my_own_text'
    });

    expect(parsed.seoPackage.slug).toBe('example-title');
  });
});
