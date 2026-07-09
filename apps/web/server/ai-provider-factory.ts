import { MockAIProvider, OpenAIProvider, type AIProvider } from '@/server/ai-provider';
import { SettingsService } from '@/server/settings-service';

/**
 * Builds the AI provider that should actually handle generation requests.
 * Uses the real OpenAI API when a key is configured in Settings; falls back
 * to MockAIProvider (a placeholder, not real content generation) otherwise.
 */
export async function createAiProvider(configDir: string, siteKey?: string): Promise<AIProvider> {
  const settingsService = new SettingsService(configDir);
  const openAiConfig = await settingsService.getOpenAiProviderConfig(siteKey);

  if (!openAiConfig) {
    return new MockAIProvider();
  }

  return new OpenAIProvider({
    apiKey: openAiConfig.apiKey,
    textModel: openAiConfig.textModel,
    imageModel: openAiConfig.imageModel
  });
}
