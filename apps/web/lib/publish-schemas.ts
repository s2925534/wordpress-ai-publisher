import { z } from 'zod';

import { sourceSafetySchema } from '@/lib/ai-schemas';

export const publishActionSchema = z.enum(['draft', 'publish', 'schedule']);

export const packageUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  linkedinPost: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  plainCsvTags: z.string().min(1).optional(),
  altText: z.string().min(1).optional(),
  suggestedImageFileName: z.string().min(1).optional(),
  sourceSafetyType: sourceSafetySchema.optional(),
  seoPackage: z
    .object({
      seoTitle: z.string().min(1),
      slug: z.string().min(1),
      metaDescription: z.string().min(1),
      primaryKeyword: z.string().min(1),
      secondaryKeywords: z.array(z.string().min(1)),
      searchIntentSummary: z.string().min(1),
      readinessScore: z.number().int().min(0).max(100),
      warnings: z.array(z.string().min(1)),
      internalLinkSuggestions: z.array(z.string().min(1))
    })
    .optional()
});

export const publishRequestSchema = z.object({
  packageId: z.string().min(1),
  action: publishActionSchema,
  confirmNewCategory: z.boolean().default(false),
  confirmPublish: z.boolean().default(false),
  confirmImageApproval: z.boolean().default(false),
  idempotencyKey: z.string().min(8),
  selectedCategoryIds: z.array(z.number().int().positive()).default([]),
  selectedTagNames: z.array(z.string().min(1)).default([]),
  newCategoryName: z.string().min(1).optional(),
  newCategorySlug: z.string().min(1).optional(),
  featuredMediaUrl: z.string().url().optional(),
  featuredMediaAltText: z.string().min(1).optional(),
  publishAt: z.string().datetime().optional()
});

export type PublishAction = z.infer<typeof publishActionSchema>;
export type PackageUpdate = z.infer<typeof packageUpdateSchema>;
export type PublishRequest = z.infer<typeof publishRequestSchema>;
