import { z } from 'zod';

const lowercaseHyphenated = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase hyphenated value');

export const sourceSafetySchema = z.enum([
  'my_own_text',
  'public_reference',
  'third_party_text',
  'notes_only',
  'unknown'
]);

export const categoryRecommendationSchema = z.object({
  name: z.string().min(1),
  slug: lowercaseHyphenated.optional(),
  confidence: z.enum(['high', 'medium', 'low', 'none']),
  reason: z.string().min(1),
  existingCategoryId: z.number().int().positive().optional()
});

export const seoPackageSchema = z.object({
  seoTitle: z.string().min(1),
  slug: lowercaseHyphenated,
  metaDescription: z.string().min(1),
  primaryKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string().min(1)),
  searchIntentSummary: z.string().min(1),
  readinessScore: z.number().int().min(0).max(100),
  warnings: z.array(z.string().min(1)),
  internalLinkSuggestions: z.array(z.string().min(1))
});

export const publicationPackageSchema = z.object({
  title: z.string().min(1),
  linkedinPost: z.string().min(1),
  excerpt: z.string().min(1),
  plainCsvTags: z.string().min(1),
  recommendedCategories: z.array(categoryRecommendationSchema),
  recommendedTags: z.array(z.string().min(1)),
  featureImagePrompt: z.string().min(1).nullable().optional(),
  altText: z.string().min(1).nullable().optional(),
  suggestedImageFileName: lowercaseHyphenated.nullable().optional(),
  seoPackage: seoPackageSchema,
  sourceSafetyType: sourceSafetySchema
});

export const aiRegenerationSectionSchema = z.enum([
  'title',
  'linkedinPost',
  'excerpt',
  'metaDescription',
  'slug',
  'tags',
  'categoryRecommendation',
  'featureImagePrompt',
  'featureImage',
  'altText',
  'introduction',
  'conclusion'
]);

export type SourceSafetyType = z.infer<typeof sourceSafetySchema>;
export type CategoryRecommendation = z.infer<typeof categoryRecommendationSchema>;
export type SeoPackage = z.infer<typeof seoPackageSchema>;
export type PublicationPackage = z.infer<typeof publicationPackageSchema>;
export type AiRegenerationSection = z.infer<typeof aiRegenerationSectionSchema>;
