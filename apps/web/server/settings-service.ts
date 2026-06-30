import type { PrismaClient } from '@prisma/client';

import {
  DEFAULT_AI_PROVIDER,
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_TEXT_MODEL
} from '@/lib/ai-defaults';
import { settingsUpdateSchema, type SettingsUpdate } from '@/lib/settings-schemas';
import { buildSettingsCompletionStatus } from '@/lib/settings-summary';
import { ConfigService } from '@/server/config-service';
import { decryptSecret, encryptSecret, hasStoredSecret } from '@/server/secret-utils';

type SettingsPrisma = Pick<PrismaClient, 'localSetting' | 'wordPressSite'>;

const AI_PROVIDER_KEY = 'ai.provider';
const OPENAI_API_KEY = 'ai.openai_api_key';
const OPENAI_TEXT_MODEL_KEY = 'ai.openai_text_model';
const OPENAI_IMAGE_MODEL_KEY = 'ai.openai_image_model';

function splitSiteUrl(siteUrl: string) {
  try {
    const parsed = new URL(siteUrl);
    return {
      siteProtocol: parsed.protocol.replace(':', '') === 'http' ? 'http' : 'https',
      siteHostname: parsed.hostname
    } as const;
  } catch {
    return {
      siteProtocol: 'https' as const,
      siteHostname: ''
    };
  }
}

function buildSiteUrl(protocol?: string, hostname?: string, fallbackUrl?: string) {
  if (hostname?.trim()) {
    const normalizedProtocol = protocol === 'http' ? 'http' : 'https';
    return `${normalizedProtocol}://${hostname.trim()}`;
  }

  return fallbackUrl ?? 'https://localhost:3000';
}

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
        siteProtocol: splitSiteUrl(siteConfig.siteUrl).siteProtocol,
        siteHostname: splitSiteUrl(siteConfig.siteUrl).siteHostname,
        timezone: null,
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
      aiProvider: aiProvider || DEFAULT_AI_PROVIDER,
      openAiKeyConfigured: hasStoredSecret(openAiApiKey),
      openAiTextModel: openAiTextModel || DEFAULT_OPENAI_TEXT_MODEL,
      openAiImageModel: openAiImageModel || DEFAULT_OPENAI_IMAGE_MODEL,
      defaultSiteKey: siteKey,
      wordpressSiteConfigured: Boolean(site.siteHostname),
      wordpressSiteUrl: site.siteUrl,
      wordpressSiteProtocol:
        (site.siteProtocol || splitSiteUrl(site.siteUrl).siteProtocol) as 'http' | 'https',
      wordpressSiteHostname: site.siteHostname || splitSiteUrl(site.siteUrl).siteHostname,
      wordpressTimezone: site.timezone || '',
      wordpressUsername: site.username ?? '',
      wordpressPasswordConfigured: hasStoredSecret(site.encryptedApplicationPassword),
      pluginTokenConfigured: hasStoredSecret(site.encryptedPluginToken),
      wordpressPluginToken: decryptSecret(site.encryptedPluginToken)
    };

    return {
      ...values,
      completion: buildSettingsCompletionStatus({
        appUrl: values.appUrl,
        openAiKey: values.openAiKeyConfigured ? 'configured' : '',
        wordpressSiteConfigured: values.wordpressSiteConfigured,
        wordpressSiteUrl: values.wordpressSiteUrl,
        wordpressSiteProtocol: values.wordpressSiteProtocol,
        wordpressSiteHostname: values.wordpressSiteHostname,
        wordpressTimezone: values.wordpressTimezone,
        wordpressUsername: values.wordpressUsername,
        wordpressPassword: values.wordpressPasswordConfigured ? 'configured' : '',
        pluginToken: values.pluginTokenConfigured ? 'configured' : ''
      })
    };
  }

  async updateSettings(input: SettingsUpdate, siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site') {
    const parsed = settingsUpdateSchema.parse(input);
    const siteConfig = await this.configService.loadSiteConfig(siteKey);
    const fallbackSiteUrl = parsed.wordpressSiteUrl?.trim() || siteConfig.siteUrl;
    const siteUrl = buildSiteUrl(parsed.wordpressSiteProtocol, parsed.wordpressSiteHostname, fallbackSiteUrl);
    const siteParts = splitSiteUrl(siteUrl);

    await this.setSetting(AI_PROVIDER_KEY, parsed.aiProvider);
    await this.setSecretSetting(OPENAI_API_KEY, parsed.openAiApiKey);
    await this.setSetting(OPENAI_TEXT_MODEL_KEY, parsed.openAiTextModel);
    await this.setSetting(OPENAI_IMAGE_MODEL_KEY, parsed.openAiImageModel);

    const siteUpdate: {
      name: string;
      siteUrl: string;
      siteProtocol: 'http' | 'https';
      siteHostname: string;
      timezone: string | null;
      defaultStatus: 'draft' | 'publish' | 'future' | 'pending' | 'private';
      username?: string;
      encryptedApplicationPassword?: string;
      encryptedPluginToken?: string;
    } = {
      name: siteConfig.siteName,
      siteUrl,
      siteProtocol: siteParts.siteProtocol,
      siteHostname: parsed.wordpressSiteHostname?.trim() || siteParts.siteHostname,
      timezone: parsed.wordpressTimezone?.trim() || null,
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
