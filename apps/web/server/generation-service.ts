import { generatedPackageResponseSchema, generationRequestSchema, type GenerationInputMode } from '@/lib/generation-schemas';
import { MockAIProvider, type AIProvider } from '@/server/ai-provider';
import { ConfigService } from '@/server/config-service';
import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';
import { RecommendationService } from '@/server/recommendation-service';
import type { SourceSafetyType } from '@/lib/ai-schemas';
import type { AiSafeguard } from '@/lib/ai-safeguards';

type GeneratePackageInput = {
  inputText: string;
  inputMode?: GenerationInputMode;
  sourceSafetyType: SourceSafetyType;
  siteKey?: string;
  contentProfileKey?: string;
  aiSafeguard?: AiSafeguard;
};

export class GenerationService {
  private readonly configService: ConfigService;
  private readonly aiProvider: AIProvider;
  private readonly recommendationService: RecommendationService;

  constructor(private readonly configDir: string, aiProvider: AIProvider = new MockAIProvider()) {
    this.configService = new ConfigService(configDir);
    this.aiProvider = aiProvider;
    this.recommendationService = new RecommendationService(configDir);
  }

  async generatePackage(input: GeneratePackageInput) {
    const parsed = generationRequestSchema.parse(input);
    const siteConfig = await this.loadSiteConfig(parsed.siteKey);
    const contentProfile = await this.loadContentProfile(parsed.contentProfileKey);

    const packageResult = await this.aiProvider.generatePublicationPackage({
      inputText: parsed.inputText,
      inputMode: parsed.inputMode,
      sourceSafetyType: parsed.sourceSafetyType,
      siteConfig,
      contentProfile,
      aiSafeguard: parsed.aiSafeguard
    });

    const recommendations = await this.recommendationService.recommend({
      siteKey: parsed.siteKey,
      inputText: parsed.inputText,
      title: packageResult.title,
      tags: packageResult.recommendedTags
    });

    return generatedPackageResponseSchema.parse({
      ...packageResult,
      recommendedCategories: recommendations.recommendedCategories.length
        ? recommendations.recommendedCategories
        : packageResult.recommendedCategories,
      recommendedTags: recommendations.recommendedTags.length
        ? recommendations.recommendedTags
        : packageResult.recommendedTags,
      plainCsvTags: recommendations.recommendedTags.length
        ? recommendations.recommendedTags.join(', ')
        : packageResult.plainCsvTags,
      tagRecommendations: recommendations.tagRecommendations,
      suggestedNewCategory: recommendations.suggestedNewCategory
    });
  }

  private async loadSiteConfig(siteKey?: string) {
    if (!siteKey) {
      return createDefaultSiteConfig(process.env.APP_URL ?? 'http://localhost:3000');
    }

    try {
      return await this.configService.loadSiteConfig(siteKey);
    } catch {
      return createDefaultSiteConfig(process.env.APP_URL ?? 'http://localhost:3000');
    }
  }

  private async loadContentProfile(contentProfileKey?: string) {
    if (!contentProfileKey) {
      return createDefaultContentProfile();
    }

    try {
      return await this.configService.loadContentProfile(contentProfileKey);
    } catch {
      return createDefaultContentProfile();
    }
  }
}
