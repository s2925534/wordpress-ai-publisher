import { describe, expect, it } from 'vitest';

import { SettingsService } from '@/server/settings-service';

function createMockPrisma() {
  const sites: Array<any> = [];
  const settings: Record<string, string> = {};

  return {
    localSetting: {
      async findUnique({ where }: any) {
        return settings[where.key] ? { key: where.key, value: settings[where.key] } : null;
      },
      async upsert({ where, create, update }: any) {
        settings[where.key] = update?.value ?? create.value;
        return { key: where.key, value: settings[where.key] };
      }
    },
    wordPressSite: {
      async findUnique({ where }: any) {
        return sites.find((site) => site.siteKey === where.siteKey) ?? null;
      },
      async upsert({ where, create, update }: any) {
        let existing = sites.find((site) => site.siteKey === where.siteKey);
        if (!existing) {
          existing = { id: `site-${sites.length + 1}`, ...create };
          sites.push(existing);
          return existing;
        }
        Object.assign(existing, update);
        return existing;
      }
    }
  };
}

describe('SettingsService', () => {
  it('stores WordPress credentials in the database-backed site record', async () => {
    const prisma = createMockPrisma();
    const service = new SettingsService('./config', { prisma: prisma as any });

    const result = await service.updateSettings({
      openAiApiKey: 'openai-key',
      wordpressSiteUrl: 'https://veloso.dev',
      wordpressUsername: 'pedro',
      wordpressApplicationPassword: 'app-password',
      wordpressPluginToken: 'plugin-token'
    });

    expect(result.openAiKeyConfigured).toBe(true);
    expect(result.wordpressUsername).toBe('pedro');
    expect(result.wordpressPasswordConfigured).toBe(true);
    expect(result.pluginTokenConfigured).toBe(true);
    expect(result.wordpressPluginToken).toBe('plugin-token');
  });

  it('stores custom AI safeguards without overwriting site settings', async () => {
    const prisma = createMockPrisma();
    const service = new SettingsService('./config', { prisma: prisma as any });

    await service.updateSettings({
      wordpressSiteUrl: 'https://veloso.dev',
      wordpressUsername: 'pedro'
    });

    const result = await service.updateSettings({
      aiSafeguards: [
        {
          id: 'default-original-task-aware',
          name: 'Default task-aware generation',
          readonly: true,
          guidelines:
            'Treat user input as instructions when it is phrased as a task and produce the requested content.'
        },
        {
          id: 'custom-jokes',
          name: 'Jokes',
          readonly: false,
          guidelines:
            'When asked for a joke, generate the joke itself rather than summarizing the request.'
        }
      ],
      selectedAiSafeguardId: 'custom-jokes'
    });

    expect(result.wordpressUsername).toBe('pedro');
    expect(result.wordpressSiteUrl).toBe('https://veloso.dev');
    expect(result.selectedAiSafeguardId).toBe('custom-jokes');
    expect(result.aiSafeguards.some((item) => item.id === 'custom-jokes')).toBe(true);
  });
});
