import type { PrismaClient } from '@prisma/client';

import {
  DEFAULT_AI_PROVIDER,
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_TEXT_MODEL
} from '@/lib/ai-defaults';
import { settingsUpdateSchema, type SettingsUpdate } from '@/lib/settings-schemas';
import {
  defaultAiSafeguard,
  normalizeAiSafeguards,
  resolveSelectedSafeguard,
  type AiSafeguard
} from '@/lib/ai-safeguards';
import { buildSettingsCompletionStatus } from '@/lib/settings-summary';
import { ConfigService } from '@/server/config-service';
import { decryptSecret, encryptSecret, hasStoredSecret } from '@/server/secret-utils';

type SettingsPrisma = Pick<PrismaClient, 'localSetting' | 'wordPressSite'>;

const AI_PROVIDER_KEY = 'ai.provider';
const OPENAI_API_KEY = 'ai.openai_api_key';
const OPENAI_TEXT_MODEL_KEY = 'ai.openai_text_model';
const OPENAI_IMAGE_MODEL_KEY = 'ai.openai_image_model';
const AI_SAFEGUARDS_KEY = 'ai.safeguards';
const SELECTED_AI_SAFEGUARD_KEY = 'ai.selected_safeguard_id';

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
    const aiSafeguards = normalizeAiSafeguards(this.parseJsonSetting<AiSafeguard[]>(await this.getSetting(AI_SAFEGUARDS_KEY)) ?? [
      defaultAiSafeguard
    ]);
    const selectedAiSafeguard = resolveSelectedSafeguard(
      aiSafeguards,
      await this.getSetting(SELECTED_AI_SAFEGUARD_KEY)
    );

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
      wordpressPluginToken: decryptSecret(site.encryptedPluginToken),
      aiSafeguards,
      selectedAiSafeguardId: selectedAiSafeguard.id
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

    await this.setSetting(AI_PROVIDER_KEY, parsed.aiProvider);
    await this.setSecretSetting(OPENAI_API_KEY, parsed.openAiApiKey);
    await this.setSetting(OPENAI_TEXT_MODEL_KEY, parsed.openAiTextModel);
    await this.setSetting(OPENAI_IMAGE_MODEL_KEY, parsed.openAiImageModel);
    await this.setJsonSetting(
      AI_SAFEGUARDS_KEY,
      parsed.aiSafeguards ? normalizeAiSafeguards(parsed.aiSafeguards) : undefined
    );
    await this.setSetting(SELECTED_AI_SAFEGUARD_KEY, parsed.selectedAiSafeguardId);

    const hasSiteUpdate =
      parsed.wordpressSiteProtocol !== undefined ||
      parsed.wordpressSiteHostname !== undefined ||
      parsed.wordpressSiteUrl !== undefined ||
      parsed.wordpressTimezone !== undefined ||
      parsed.wordpressUsername !== undefined ||
      parsed.wordpressApplicationPassword !== undefined ||
      parsed.wordpressPluginToken !== undefined;

    if (hasSiteUpdate) {
      const currentSite = await this.prisma.wordPressSite.findUnique({ where: { siteKey } });
      const fallbackSiteUrl = parsed.wordpressSiteUrl?.trim() || currentSite?.siteUrl || siteConfig.siteUrl;
      const siteUrl = buildSiteUrl(
        parsed.wordpressSiteProtocol ?? currentSite?.siteProtocol ?? undefined,
        parsed.wordpressSiteHostname ?? currentSite?.siteHostname ?? undefined,
        fallbackSiteUrl
      );
      const siteParts = splitSiteUrl(siteUrl);

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
        siteHostname: parsed.wordpressSiteHostname?.trim() || currentSite?.siteHostname || siteParts.siteHostname,
        timezone: parsed.wordpressTimezone?.trim() || currentSite?.timezone || null,
        defaultStatus: siteConfig.wordpress.defaultStatus
      };

      if (parsed.wordpressUsername?.trim()) {
        siteUpdate.username = parsed.wordpressUsername.trim();
      } else if (currentSite?.username) {
        siteUpdate.username = currentSite.username;
      }

      if (parsed.wordpressApplicationPassword?.trim()) {
        siteUpdate.encryptedApplicationPassword = encryptSecret(parsed.wordpressApplicationPassword.trim());
      } else if (currentSite?.encryptedApplicationPassword) {
        siteUpdate.encryptedApplicationPassword = currentSite.encryptedApplicationPassword;
      }

      if (parsed.wordpressPluginToken?.trim()) {
        siteUpdate.encryptedPluginToken = encryptSecret(parsed.wordpressPluginToken.trim());
      } else if (currentSite?.encryptedPluginToken) {
        siteUpdate.encryptedPluginToken = currentSite.encryptedPluginToken;
      }

      await this.prisma.wordPressSite.upsert({
        where: { siteKey },
        create: {
          siteKey,
          ...siteUpdate
        },
        update: siteUpdate
      });
    }

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

  private parseJsonSetting<T>(value: string) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private async setJsonSetting(key: string, value?: unknown) {
    if (value === undefined) {
      return;
    }

    await this.setSetting(key, JSON.stringify(value));
  }
}

function getDefaultPrisma() {
  return require('@/lib/prisma').prisma as PrismaClient;
}
