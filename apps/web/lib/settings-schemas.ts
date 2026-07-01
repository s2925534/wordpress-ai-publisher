import { z } from 'zod';

import { aiSafeguardsSchema } from '@/lib/ai-safeguards';

export const settingsUpdateSchema = z.object({
  aiProvider: z.string().min(1).optional(),
  openAiApiKey: z.string().optional(),
  openAiTextModel: z.string().optional(),
  openAiImageModel: z.string().optional(),
  wordpressSiteProtocol: z.enum(['http', 'https']).optional(),
  wordpressSiteHostname: z.string().optional(),
  wordpressSiteUrl: z.string().url().optional(),
  wordpressTimezone: z.string().optional(),
  wordpressUsername: z.string().optional(),
  wordpressApplicationPassword: z.string().optional(),
  wordpressPluginToken: z.string().optional(),
  aiSafeguards: aiSafeguardsSchema.optional(),
  selectedAiSafeguardId: z.string().min(1).optional()
});

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
