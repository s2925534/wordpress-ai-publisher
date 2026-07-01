import { z } from 'zod';

import { sourceSafetySchema } from '@/lib/ai-schemas';
import { aiSafeguardSchema } from '@/lib/ai-safeguards';

export const generationInputModeSchema = z.enum(['ai_prompt', 'source_material']);

export const generationRequestSchema = z.object({
  inputText: z.string().trim().min(20).max(8000),
  inputMode: generationInputModeSchema.default('ai_prompt'),
  sourceSafetyType: sourceSafetySchema,
  siteKey: z.string().min(1).optional(),
  contentProfileKey: z.string().min(1).optional(),
  aiSafeguard: aiSafeguardSchema.optional()
});

export const generatedPackageResponseSchema = z.object({
  packageId: z.string().min(1).optional(),
  generationRequestId: z.string().min(1).optional(),
  title: z.string().min(1),
  linkedinPost: z.string().min(1),
  excerpt: z.string().min(1),
  plainCsvTags: z.string().min(1),
  recommendedCategories: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1).optional(),
      confidence: z.enum(['high', 'medium', 'low', 'none']),
      reason: z.string().min(1),
      existingCategoryId: z.number().int().positive().optional()
    })
  ),
  recommendedTags: z.array(z.string().min(1)),
  tagRecommendations: z
    .array(
      z.object({
        name: z.string().min(1),
        confidence: z.enum(['high', 'medium', 'low']),
        reason: z.string().min(1),
        existingTagId: z.number().int().positive().optional()
      })
    )
    .optional(),
  suggestedNewCategory: z
    .object({
      name: z.string().min(1),
      slug: z.string().min(1),
      reason: z.string().min(1)
    })
    .optional(),
  featureImagePrompt: z.string().nullable().optional(),
  altText: z.string().nullable().optional(),
  suggestedImageFileName: z.string().nullable().optional(),
  featureImageUrl: z.string().url().nullable().optional(),
  imagePreviewUrl: z.string().url().nullable().optional(),
  seoPackage: z.object({
    seoTitle: z.string().min(1),
    slug: z.string().min(1),
    metaDescription: z.string().min(1),
    primaryKeyword: z.string().min(1),
    secondaryKeywords: z.array(z.string().min(1)),
    searchIntentSummary: z.string().min(1),
    readinessScore: z.number().int().min(0).max(100),
    warnings: z.array(z.string().min(1)),
    internalLinkSuggestions: z.array(z.string().min(1))
  }),
  sourceSafetyType: sourceSafetySchema
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GeneratedPackageResponse = z.infer<typeof generatedPackageResponseSchema>;
export type GenerationInputMode = z.infer<typeof generationInputModeSchema>;
