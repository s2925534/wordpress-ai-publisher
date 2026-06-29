import { describe, expect, it } from 'vitest';

import {
  aiRegenerationSectionSchema,
  publicationPackageSchema,
  seoPackageSchema,
  sourceSafetySchema
} from '@/lib/ai-schemas';

describe('AI schemas', () => {
  it('accepts the supported source safety values', () => {
    expect(sourceSafetySchema.parse('my_own_text')).toBe('my_own_text');
    expect(sourceSafetySchema.parse('unknown')).toBe('unknown');
  });

  it('rejects invalid publication packages', () => {
    expect(() =>
      publicationPackageSchema.parse({
        title: 'Example',
        linkedinPost: 'Example',
        excerpt: 'Example',
        plainCsvTags: 'one, two',
        recommendedCategories: [],
        recommendedTags: [],
        seoPackage: {
          seoTitle: 'Example',
          slug: 'example',
          metaDescription: 'Example',
          primaryKeyword: 'Example',
          secondaryKeywords: [],
          searchIntentSummary: 'Example',
          readinessScore: 50,
          warnings: [],
          internalLinkSuggestions: []
        },
        sourceSafetyType: 'my_own_text'
      })
    ).not.toThrow();
  });

  it('validates seo packages', () => {
    expect(() =>
      seoPackageSchema.parse({
        seoTitle: 'Example',
        slug: 'example-title',
        metaDescription: 'A concise description.',
        primaryKeyword: 'Example',
        secondaryKeywords: ['one'],
        searchIntentSummary: 'Readers want a clear example.',
        readinessScore: 80,
        warnings: [],
        internalLinkSuggestions: []
      })
    ).not.toThrow();
  });

  it('accepts supported regeneration sections', () => {
    expect(aiRegenerationSectionSchema.parse('altText')).toBe('altText');
  });
});
