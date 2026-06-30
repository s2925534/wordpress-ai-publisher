import { z } from 'zod';

export const settingsUpdateSchema = z.object({
  aiProvider: z.string().min(1).optional(),
  openAiApiKey: z.string().optional(),
  openAiTextModel: z.string().optional(),
  openAiImageModel: z.string().optional(),
  wordpressSiteUrl: z.string().url().optional(),
  wordpressUsername: z.string().optional(),
  wordpressApplicationPassword: z.string().optional(),
  wordpressPluginToken: z.string().optional()
});

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
