import type { PrismaClient } from '@prisma/client';

import { settingsUpdateSchema, type SettingsUpdate } from '@/lib/settings-schemas';
import { buildSettingsCompletionStatus } from '@/lib/settings-summary';
import { ConfigService } from '@/server/config-service';
import { encryptSecret, hasStoredSecret } from '@/server/secret-utils';

type SettingsPrisma = Pick<PrismaClient, 'localSetting' | 'wordPressSite'>;

const AI_PROVIDER_KEY = 'ai.provider';
const OPENAI_API_KEY = 'ai.openai_api_key';
const OPENAI_TEXT_MODEL_KEY = 'ai.openai_text_model';
const OPENAI_IMAGE_MODEL_KEY = 'ai.openai_image_model';

export class SettingsService {
  private readonly prisma: SettingsPrisma;
  private readonly configService: ConfigService;

  constructor(private readonly configDir: string, deps: { prisma?: SettingsPrisma } = {}) {
    this.prisma = deps.prisma ?? getDefaultPrisma();
    this.configService = new ConfigService(configDir);
  }

  async getSettings(siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site') {
    const siteConfig = await this.configService.loadSiteConfig(siteKey);
    const site = await this.prisma.wordPressSite.upsert({
      where: { siteKey },
      create: {
        siteKey,
        name: siteConfig.siteName,
        siteUrl: siteConfig.siteUrl,
        defaultStatus: siteConfig.wordpress.defaultStatus
      },
      update: {
        defaultStatus: siteConfig.wordpress.defaultStatus
      }
    });

    const aiProvider = await this.getSetting(AI_PROVIDER_KEY);
    const openAiApiKey = await this.getSetting(OPENAI_API_KEY);
    const openAiTextModel = await this.getSetting(OPENAI_TEXT_MODEL_KEY);
    const openAiImageModel = await this.getSetting(OPENAI_IMAGE_MODEL_KEY);

    const values = {
      appUrl: process.env.APP_URL ?? 'http://localhost:3000',
      aiProvider: aiProvider || process.env.AI_PROVIDER || 'openai',
      openAiKeyConfigured: hasStoredSecret(openAiApiKey) || Boolean(process.env.OPENAI_API_KEY),
      openAiTextModel: openAiTextModel || process.env.OPENAI_TEXT_MODEL || '',
      openAiImageModel: openAiImageModel || process.env.OPENAI_IMAGE_MODEL || '',
      defaultSiteKey: siteKey,
      wordpressSiteUrl: site.siteUrl,
      wordpressUsername: site.username ?? '',
      wordpressPasswordConfigured: hasStoredSecret(site.encryptedApplicationPassword),
      pluginTokenConfigured: hasStoredSecret(site.encryptedPluginToken)
    };

    return {
      ...values,
      completion: buildSettingsCompletionStatus({
        appUrl: values.appUrl,
        openAiKey: values.openAiKeyConfigured ? 'configured' : '',
        wordpressSiteUrl: values.wordpressSiteUrl,
        wordpressUsername: values.wordpressUsername,
        wordpressPassword: values.wordpressPasswordConfigured ? 'configured' : '',
        pluginToken: values.pluginTokenConfigured ? 'configured' : ''
      })
    };
  }

  async updateSettings(input: SettingsUpdate, siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site') {
    const parsed = settingsUpdateSchema.parse(input);
    const siteConfig = await this.configService.loadSiteConfig(siteKey);

    await this.setSetting(AI_PROVIDER_KEY, parsed.aiProvider);
    await this.setSecretSetting(OPENAI_API_KEY, parsed.openAiApiKey);
    await this.setSetting(OPENAI_TEXT_MODEL_KEY, parsed.openAiTextModel);
    await this.setSetting(OPENAI_IMAGE_MODEL_KEY, parsed.openAiImageModel);

    const siteUpdate: {
      name: string;
      siteUrl: string;
      defaultStatus: 'draft' | 'publish' | 'future' | 'pending' | 'private';
      username?: string;
      encryptedApplicationPassword?: string;
      encryptedPluginToken?: string;
    } = {
      name: siteConfig.siteName,
      siteUrl: parsed.wordpressSiteUrl?.trim() || siteConfig.siteUrl,
      defaultStatus: siteConfig.wordpress.defaultStatus
    };

    if (parsed.wordpressUsername?.trim()) {
      siteUpdate.username = parsed.wordpressUsername.trim();
    }

    if (parsed.wordpressApplicationPassword?.trim()) {
      siteUpdate.encryptedApplicationPassword = encryptSecret(parsed.wordpressApplicationPassword.trim());
    }

    if (parsed.wordpressPluginToken?.trim()) {
      siteUpdate.encryptedPluginToken = encryptSecret(parsed.wordpressPluginToken.trim());
    }

    await this.prisma.wordPressSite.upsert({
      where: { siteKey },
      create: {
        siteKey,
        ...siteUpdate
      },
      update: siteUpdate
    });

    return this.getSettings(siteKey);
  }

  private async getSetting(key: string) {
    const record = await this.prisma.localSetting.findUnique({ where: { key } });
    return record?.value ?? '';
  }

  private async setSetting(key: string, value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }

    await this.prisma.localSetting.upsert({
      where: { key },
      create: { key, value: trimmed },
      update: { value: trimmed }
    });
  }

  private async setSecretSetting(key: string, value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }

    await this.setSetting(key, encryptSecret(trimmed));
  }
}

function getDefaultPrisma() {
  return require('@/lib/prisma').prisma as PrismaClient;
}
