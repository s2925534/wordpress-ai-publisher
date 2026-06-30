import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDefaultSiteConfig } from '@/server/default-config';
import { decryptSecret } from '@/server/secret-utils';
import { SettingsService } from '@/server/settings-service';

function createConfigDir() {
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-settings-'));
  mkdirSync(path.join(configDir, 'sites'), { recursive: true });
  writeFileSync(path.join(configDir, 'sites', 'default-site.json'), JSON.stringify(createDefaultSiteConfig('https://example.com')));
  return configDir;
}

function createMockPrisma() {
  const settings = new Map<string, string>();
  let site: any = null;

  return {
    localSetting: {
      async findUnique({ where }: any) {
        const value = settings.get(where.key);
        return value ? { key: where.key, value } : null;
      },
      async upsert({ where, create, update }: any) {
        const value = settings.has(where.key) ? update.value : create.value;
        settings.set(where.key, value);
        return { key: where.key, value };
      }
    },
    wordPressSite: {
      async upsert({ create, update }: any) {
        site = site ? { ...site, ...update } : { id: 'site-1', ...create };
        return site;
      }
    },
    __state: { settings, get site() { return site; } }
  };
}

describe('SettingsService', () => {
  it('stores credentials encrypted and returns only configured flags', async () => {
    process.env.APP_ENCRYPTION_KEY = 'test-encryption-key-with-enough-length';
    const prisma = createMockPrisma();
    const service = new SettingsService(createConfigDir(), { prisma: prisma as any });

    const result = await service.updateSettings({
      aiProvider: 'openai',
      openAiApiKey: 'sk-test',
      openAiTextModel: 'text-model',
      openAiImageModel: 'image-model',
      wordpressSiteUrl: 'https://custom.example',
      wordpressUsername: 'editor',
      wordpressApplicationPassword: 'application-password',
      wordpressPluginToken: 'plugin-token'
    });

    expect(result.openAiKeyConfigured).toBe(true);
    expect(result.wordpressSiteUrl).toBe('https://custom.example');
    expect(result.wordpressPasswordConfigured).toBe(true);
    expect(result.pluginTokenConfigured).toBe(true);
    expect(JSON.stringify(result)).not.toContain('sk-test');
    expect(JSON.stringify(result)).not.toContain('application-password');
    expect(JSON.stringify(result)).not.toContain('plugin-token');
    expect(decryptSecret(prisma.__state.settings.get('ai.openai_api_key'))).toBe('sk-test');
    expect(decryptSecret(prisma.__state.site.encryptedPluginToken)).toBe('plugin-token');
  });
});
