import { z } from 'zod';

const lowercaseHyphenated = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase hyphenated value');

export const siteConfigSchema = z.object({
  siteKey: lowercaseHyphenated,
  siteName: z.string().min(1),
  siteUrl: z.string().url(),
  wordpress: z.object({
    defaultStatus: z.enum(['draft', 'publish', 'future', 'pending', 'private']),
    allowPublish: z.boolean(),
    allowSchedule: z.boolean(),
    allowCategoryCreation: z.boolean(),
    allowTagCreation: z.boolean(),
    preferExistingCategories: z.boolean(),
    preferExistingTags: z.boolean()
  }),
  plugin: z.object({
    routeNamespace: z.string().min(1),
    requiresToken: z.boolean()
  }),
  brand: z.object({
    displayName: z.string().min(1),
    positioning: z.string().min(1),
    audiences: z.array(z.string().min(1)),
    preferredTone: z.array(z.string().min(1)),
    avoidTone: z.array(z.string().min(1))
  }),
  contentPackage: z.object({
    outputOrder: z.array(z.string().min(1)).min(1),
    maxCharacters: z.number().int().positive(),
    linkedinPostMustEndWithHashtags: z.boolean()
  }),
  hashtags: z.object({
    alwaysInclude: z.array(z.string().min(1)),
    preferred: z.array(z.string().min(1)),
    maxHashtags: z.number().int().positive()
  }),
  tags: z.object({
    alwaysConsider: z.array(z.string().min(1)),
    preferred: z.array(z.string().min(1)),
    minTags: z.number().int().nonnegative(),
    maxTags: z.number().int().positive()
  }),
  categories: z.object({
    mode: z.enum(['discover_live_first', 'fallback_only']),
    fallbackCategories: z.array(z.string().min(1)),
    avoidUnlessExplicit: z.array(z.string().min(1)),
    allowSuggestedNewCategory: z.boolean(),
    requireConfirmationBeforeCreate: z.boolean()
  }),
  seo: z.object({
    generateSeoTitle: z.boolean(),
    generateMetaDescription: z.boolean(),
    generatePrimaryKeyword: z.boolean(),
    generateSecondaryKeywords: z.boolean(),
    generateSlug: z.boolean(),
    titleTargetLength: z.object({
      min: z.number().int().positive(),
      max: z.number().int().positive()
    }),
    metaDescriptionTargetLength: z.object({
      min: z.number().int().positive(),
      max: z.number().int().positive()
    }),
    avoidKeywordStuffing: z.boolean(),
    suggestInternalLinks: z.boolean()
  }),
  image: z.object({
    generateFeatureImage: z.boolean(),
    requireAltText: z.boolean(),
    allowNoImage: z.boolean(),
    style: z.array(z.string().min(1)),
    avoid: z.array(z.string().min(1)),
    filenameFormat: z.enum(['lowercase-hyphenated'])
  }),
  urlRules: z.object({
    allowSiteUrlMentions: z.array(z.string().min(1)),
    doNotMentionAsUrl: z.array(z.string().min(1))
  }),
  jetpack: z.object({
    enabled: z.boolean(),
    socialSharingOptional: z.boolean(),
    continueIfUnavailable: z.boolean()
  })
});

export const contentProfileSchema = z.object({
  profileKey: lowercaseHyphenated,
  name: z.string().min(1),
  description: z.string().min(1),
  outputOrder: z.array(z.string().min(1)).min(1),
  writingStyle: z.object({
    prefer: z.array(z.string().min(1)),
    avoid: z.array(z.string().min(1))
  }),
  sections: z.object({
    title: z.object({
      required: z.boolean(),
      seoFriendly: z.boolean()
    }),
    linkedinPost: z.object({
      required: z.boolean(),
      shortParagraphs: z.boolean(),
      mustEndWithHashtags: z.boolean()
    }),
    excerpt: z.object({
      required: z.boolean(),
      maxParagraphs: z.number().int().positive()
    }),
    plainCsvTags: z.object({
      required: z.boolean(),
      noHashtags: z.boolean()
    }),
    recommendedCategories: z.object({
      required: z.boolean(),
      useSiteCategories: z.boolean()
    }),
    featureImage: z.object({
      required: z.boolean(),
      generatePrompt: z.boolean(),
      generateImage: z.boolean()
    }),
    altText: z.object({
      requiredWhenImageExists: z.boolean()
    }),
    suggestedImageFileName: z.object({
      requiredWhenImageExists: z.boolean(),
      format: z.enum(['lowercase-hyphenated'])
    })
  })
});

export const platformCapabilitiesSchema = z.object({
  wordpress: z.object({
    restApi: z.boolean(),
    mediaUpload: z.boolean(),
    categories: z.boolean(),
    tags: z.boolean(),
    authors: z.boolean(),
    jetpackDiscovery: z.boolean()
  }),
  app: z.object({
    localDraftStorage: z.boolean(),
    idempotency: z.boolean(),
    encryptedCredentialStorage: z.boolean()
  })
});

export const defaultSeoRulesSchema = z.object({
  titleTargetLength: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive()
  }),
  metaDescriptionTargetLength: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive()
  }),
  avoidKeywordStuffing: z.boolean(),
  suggestInternalLinks: z.boolean()
});

export const defaultImageRulesSchema = z.object({
  requireAltText: z.boolean(),
  allowNoImage: z.boolean(),
  filenameFormat: z.enum(['lowercase-hyphenated']),
  style: z.array(z.string().min(1)),
  avoid: z.array(z.string().min(1))
});

export const defaultValidationRulesSchema = z.object({
  requireFinalConfirmation: z.boolean(),
  requireImageAltText: z.boolean(),
  requireCategoryConfirmationForNew: z.boolean(),
  enableIdempotency: z.boolean(),
  maxInputCharacters: z.number().int().positive()
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type ContentProfileConfig = z.infer<typeof contentProfileSchema>;
