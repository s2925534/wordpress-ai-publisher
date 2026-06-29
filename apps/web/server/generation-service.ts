import { generatedPackageResponseSchema, generationRequestSchema } from '@/lib/generation-schemas';
import { MockAIProvider, type AIProvider } from '@/server/ai-provider';
import { ConfigService } from '@/server/config-service';
import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';
import type { SourceSafetyType } from '@/lib/ai-schemas';

type GeneratePackageInput = {
  inputText: string;
  sourceSafetyType: SourceSafetyType;
  siteKey?: string;
  contentProfileKey?: string;
};

export class GenerationService {
  private readonly configService: ConfigService;
  private readonly aiProvider: AIProvider;

  constructor(private readonly configDir: string, aiProvider: AIProvider = new MockAIProvider()) {
    this.configService = new ConfigService(configDir);
    this.aiProvider = aiProvider;
  }

  async generatePackage(input: GeneratePackageInput) {
    const parsed = generationRequestSchema.parse(input);
    const siteConfig = await this.loadSiteConfig(parsed.siteKey);
    const contentProfile = await this.loadContentProfile(parsed.contentProfileKey);

    const packageResult = await this.aiProvider.generatePublicationPackage({
      inputText: parsed.inputText,
      sourceSafetyType: parsed.sourceSafetyType,
      siteConfig,
      contentProfile
    });

    return generatedPackageResponseSchema.parse(packageResult);
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
