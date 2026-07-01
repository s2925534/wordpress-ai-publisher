import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DiscoveryService } from '@/server/discovery-service';
import { createDefaultSiteConfig } from '@/server/default-config';

function createMockPrisma() {
  const sites: Array<any> = [];
  const snapshots: Array<any> = [];

  return {
    wordPressSite: {
      async upsert({ where, create, update }: any) {
        let existing = sites.find((site) => site.siteKey === where.siteKey);
        if (!existing) {
          existing = {
            id: `site-${sites.length + 1}`,
            ...create
          };
          sites.push(existing);
          return existing;
        }
        Object.assign(existing, update);
        return existing;
      },
      async findUnique({ where }: any) {
        return sites.find((site) => site.id === where.id) ?? null;
      }
    },
    wordPressSiteSnapshot: {
      async findFirst({ where }: any) {
        const filtered = snapshots.filter((snapshot) => snapshot.wordpressSiteId === where.wordpressSiteId);
        return filtered.at(-1) ?? null;
      },
      async create({ data }: any) {
        const record = {
          id: `snapshot-${snapshots.length + 1}`,
          discoveredAt: new Date(),
          ...data
        };
        snapshots.push(record);
        return record;
      }
    },
    __state: { sites, snapshots }
  };
}

function createConfigDir() {
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-discovery-'));
  const siteDir = path.join(configDir, 'sites');
  mkdirSync(siteDir, { recursive: true });
  writeFileSync(
    path.join(siteDir, 'default-site.json'),
    JSON.stringify(createDefaultSiteConfig('https://example.com'))
  );
  return configDir;
}

describe('DiscoveryService', () => {
  it('caches a plugin discovery snapshot', async () => {
    const configDir = createConfigDir();
    const mockPrisma = createMockPrisma();
    const service = new DiscoveryService(configDir, {
      prisma: mockPrisma as any,
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              siteInfo: {
                siteName: 'Example WordPress Site',
                siteUrl: 'https://example.com',
                timezone: 'UTC',
                locale: 'en-US',
                restApiAvailable: true
              },
              canCreatePosts: true,
              canPublishPosts: true,
              canUploadMedia: true,
              canCreateCategories: true,
              canCreateTags: true,
              availablePostTypes: [],
              availablePostStatuses: [],
              categories: [
                { id: 1, name: 'News', slug: 'news', description: '', count: 1 }
              ],
              tags: [{ id: 2, name: 'Automation', slug: 'automation', description: '', count: 1 }],
              authors: [{ id: 3, name: 'Pedro', slug: 'pedro' }],
              recentPosts: [
                {
                  id: 4,
                  title: 'Recent post',
                  slug: 'recent-post',
                  url: 'https://example.com/recent-post',
                  status: 'publish'
                }
              ],
              jetpackStatus: {
                installed: true,
                active: true,
                connected: true,
                socialAvailable: true
              },
              seoPluginStatus: { yoast: true },
              mediaSettings: { maxUploadSize: 1024, mimeTypes: ['image/jpeg'] }
            },
            error: null
          }),
          { status: 200 }
        ) as Response
    });

    const result = await service.refresh('default-site');

    expect(result.source).toBe('plugin');
    expect(result.refreshed).toBe(true);
    expect(result.snapshot.categories).toHaveLength(1);
    expect(mockPrisma.__state.snapshots).toHaveLength(1);

    const latest = await service.getLatestSnapshot('default-site');
    expect(latest?.siteName).toBe('Example WordPress Site');
  });

  it('falls back when discovery is unavailable and still caches a snapshot', async () => {
    const configDir = createConfigDir();
    const mockPrisma = createMockPrisma();
    const service = new DiscoveryService(configDir, {
      prisma: mockPrisma as any,
      fetchFn: async () => {
        throw new Error('network unavailable');
      }
    });

    const result = await service.refresh('default-site');

    expect(result.source).toBe('fallback');
    expect(result.refreshed).toBe(false);
    expect(result.snapshot.restApiAvailable).toBe(false);
    expect(mockPrisma.__state.snapshots).toHaveLength(1);
  });

  it('uses the stored site url instead of the config url when refreshing', async () => {
    const configDir = createConfigDir();
    const mockPrisma = createMockPrisma();
    const service = new DiscoveryService(configDir, {
      prisma: mockPrisma as any,
      fetchFn: async (input) => {
        expect(input.toString()).toContain('https://www.veloso.dev/wp-json/publisher/v1/discovery');
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              siteInfo: {
                siteName: 'Veloso',
                siteUrl: 'https://www.veloso.dev',
                timezone: 'UTC',
                locale: 'en-US',
                restApiAvailable: true
              },
              canCreatePosts: true,
              canPublishPosts: true,
              canUploadMedia: true,
              canCreateCategories: true,
              canCreateTags: true,
              availablePostTypes: [],
              availablePostStatuses: [],
              categories: [],
              tags: [],
              authors: [],
              recentPosts: [],
              jetpackStatus: {
                installed: true,
                active: true,
                connected: true,
                socialAvailable: true
              },
              seoPluginStatus: {},
              mediaSettings: { maxUploadSize: 1024, mimeTypes: [] }
            },
            error: null
          }),
          { status: 200 }
        ) as Response;
      }
    });

    await service.getDefaultSiteRecord();
    await mockPrisma.wordPressSite.upsert({
      where: { siteKey: 'default-site' },
      update: { siteUrl: 'https://www.veloso.dev', siteHostname: 'www.veloso.dev' },
      create: {
        siteKey: 'default-site',
        name: 'Veloso',
        siteUrl: 'https://www.veloso.dev',
        siteProtocol: 'https',
        siteHostname: 'www.veloso.dev',
        timezone: null,
        defaultStatus: 'draft'
      }
    });

    const result = await service.refresh('default-site');

    expect(result.source).toBe('plugin');
    expect(result.snapshot.siteUrl).toBe('https://www.veloso.dev');
  });

  it('normalizes recent posts with missing slugs instead of falling back', async () => {
    const configDir = createConfigDir();
    const mockPrisma = createMockPrisma();
    const service = new DiscoveryService(configDir, {
      prisma: mockPrisma as any,
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              siteInfo: {
                siteName: 'Veloso',
                siteUrl: 'https://www.veloso.dev',
                timezone: 'UTC',
                locale: 'en-US',
                restApiAvailable: true
              },
              canCreatePosts: true,
              canPublishPosts: true,
              canUploadMedia: true,
              canCreateCategories: true,
              canCreateTags: true,
              availablePostTypes: [],
              availablePostStatuses: [],
              categories: [],
              tags: [],
              authors: [],
              recentPosts: [
                {
                  id: 11,
                  title: 'Recent post',
                  url: 'https://www.veloso.dev/recent-post',
                  status: 'publish'
                }
              ],
              jetpackStatus: {
                installed: true,
                active: true,
                connected: true,
                socialAvailable: true
              },
              seoPluginStatus: {},
              mediaSettings: { maxUploadSize: 1024, mimeTypes: [] }
            },
            error: null
          }),
          { status: 200 }
        ) as Response
    });

    const result = await service.refresh('default-site');

    expect(result.source).toBe('plugin');
    expect(result.snapshot.recentPosts[0]?.slug).toBe('recent-post');
  });
});
