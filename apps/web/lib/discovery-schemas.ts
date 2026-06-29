import { z } from 'zod';

const termSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().default(''),
  count: z.number().int().nonnegative().optional().default(0)
});

const authorSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  slug: z.string().min(1)
});

const recentPostSchema = z.object({
  id: z.number().int().nonnegative(),
  title: z.string().min(1),
  slug: z.string().min(1),
  url: z.string().url(),
  status: z.string().min(1)
});

const pluginDiscoveryDataSchema = z.object({
  siteInfo: z.object({
    siteName: z.string().min(1),
    siteUrl: z.string().url(),
    timezone: z.string().nullable().optional(),
    locale: z.string().nullable().optional(),
    restApiAvailable: z.boolean().optional().default(true)
  }),
  canCreatePosts: z.boolean().optional().default(false),
  canPublishPosts: z.boolean().optional().default(false),
  canUploadMedia: z.boolean().optional().default(false),
  canCreateCategories: z.boolean().optional().default(false),
  canCreateTags: z.boolean().optional().default(false),
  availablePostTypes: z.array(z.record(z.any())).optional().default([]),
  availablePostStatuses: z.array(z.record(z.any())).optional().default([]),
  categories: z.array(termSchema).optional().default([]),
  tags: z.array(termSchema).optional().default([]),
  authors: z.array(authorSchema).optional().default([]),
  recentPosts: z.array(recentPostSchema).optional().default([]),
  jetpackStatus: z
    .object({
      installed: z.boolean().optional().default(false),
      active: z.boolean().optional().default(false),
      connected: z.boolean().optional().default(false),
      socialAvailable: z.boolean().optional().default(false)
    })
    .optional()
    .default({ installed: false, active: false, connected: false, socialAvailable: false }),
  seoPluginStatus: z.record(z.any()).optional().default({}),
  mediaSettings: z
    .object({
      maxUploadSize: z.number().nullable().optional(),
      mimeTypes: z.array(z.string()).optional().default([])
    })
    .optional()
    .default({ mimeTypes: [] }),
  restApiAvailable: z.boolean().optional().default(true)
});

const pluginEnvelopeSchema = z.object({
  success: z.boolean(),
  data: pluginDiscoveryDataSchema.optional().nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.any()).optional().default({})
    })
    .nullable()
    .optional()
});

export const discoverySnapshotSchema = z.object({
  siteName: z.string().min(1),
  siteUrl: z.string().url(),
  timezone: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  restApiAvailable: z.boolean(),
  canCreatePosts: z.boolean(),
  canPublishPosts: z.boolean(),
  canUploadMedia: z.boolean(),
  canCreateCategories: z.boolean(),
  canCreateTags: z.boolean(),
  availablePostTypes: z.array(z.record(z.any())),
  availablePostStatuses: z.array(z.record(z.any())),
  categories: z.array(termSchema),
  tags: z.array(termSchema),
  authors: z.array(authorSchema),
  recentPosts: z.array(recentPostSchema),
  jetpackStatus: z.object({
    installed: z.boolean(),
    active: z.boolean(),
    connected: z.boolean(),
    socialAvailable: z.boolean()
  }),
  seoPluginStatus: z.record(z.any()),
  mediaSettings: z.object({
    maxUploadSize: z.number().nullable().optional(),
    mimeTypes: z.array(z.string())
  }),
  rawDiscovery: z.record(z.any()).optional()
});

export type DiscoverySnapshot = z.infer<typeof discoverySnapshotSchema>;
export type PluginDiscoveryEnvelope = z.infer<typeof pluginEnvelopeSchema>;
export type PluginDiscoveryData = z.infer<typeof pluginDiscoveryDataSchema>;

export { pluginEnvelopeSchema, pluginDiscoveryDataSchema };
