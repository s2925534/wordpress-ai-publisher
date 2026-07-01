import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDefaultSiteConfig } from '@/server/default-config';
import { RecommendationService } from '@/server/recommendation-service';

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

function createConfigDir({
  fallbackCategories = []
}: {
  fallbackCategories?: string[];
} = {}) {
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-recommend-'));
  const siteDir = path.join(configDir, 'sites');
  mkdirSync(siteDir, { recursive: true });
  const siteConfig = createDefaultSiteConfig('https://example.com');
  siteConfig.categories.fallbackCategories = fallbackCategories;
  writeFileSync(path.join(siteDir, 'default-site.json'), JSON.stringify(siteConfig));
  return configDir;
}

describe('RecommendationService', () => {
  it('prefers live site categories over fallback categories', async () => {
    const mockPrisma = createMockPrisma();
    const configDir = createConfigDir({ fallbackCategories: ['Fallback Category'] });
    const service = new RecommendationService(configDir, { prisma: mockPrisma as any });

    await mockPrisma.wordPressSite.upsert({
      where: { siteKey: 'default-site' },
      create: {
        siteKey: 'default-site',
        name: 'Example',
        siteUrl: 'https://example.com',
        defaultStatus: 'draft'
      },
      update: {}
    });
    await mockPrisma.wordPressSiteSnapshot.create({
      data: {
        wordpressSiteId: 'site-1',
        siteName: 'Example',
        siteUrl: 'https://example.com',
        restApiAvailable: true,
        canCreatePosts: true,
        canPublishPosts: true,
        canUploadMedia: true,
        canCreateCategories: true,
        canCreateTags: true,
        availablePostTypes: [],
        availablePostStatuses: [],
        categories: [
          { id: 1, name: 'Architecture', slug: 'architecture', description: 'Platform architecture', count: 1 },
          { id: 2, name: 'Fallback Category', slug: 'fallback-category', description: 'Should not be used', count: 1 }
        ],
        tags: [{ id: 3, name: 'Platform Engineering', slug: 'platform-engineering', description: '', count: 1 }],
        authors: [],
        jetpackStatus: { installed: false, active: false, connected: false, socialAvailable: false },
        seoPluginStatus: {},
        mediaSettings: { mimeTypes: [] },
        recentPosts: []
      }
    });

    const result = await service.recommend({
      siteKey: 'default-site',
      inputText: 'This article explains platform architecture and delivery trade-offs.',
      title: 'Platform Architecture Trade-offs'
    });

    expect(result.recommendedCategories[0]?.name).toBe('Architecture');
    expect(result.recommendedCategories[0]?.confidence).toBe('high');
    expect(result.recommendedCategories.some((category) => category.name === 'Fallback Category')).toBe(false);
  });

  it('suggests a new category when nothing matches', async () => {
    const mockPrisma = createMockPrisma();
    const configDir = createConfigDir();
    const service = new RecommendationService(configDir, { prisma: mockPrisma as any });

    await mockPrisma.wordPressSite.upsert({
      where: { siteKey: 'default-site' },
      create: {
        siteKey: 'default-site',
        name: 'Example',
        siteUrl: 'https://example.com',
        defaultStatus: 'draft'
      },
      update: {}
    });
    await mockPrisma.wordPressSiteSnapshot.create({
      data: {
        wordpressSiteId: 'site-1',
        siteName: 'Example',
        siteUrl: 'https://example.com',
        restApiAvailable: true,
        canCreatePosts: true,
        canPublishPosts: true,
        canUploadMedia: true,
        canCreateCategories: true,
        canCreateTags: true,
        availablePostTypes: [],
        availablePostStatuses: [],
        categories: [
          { id: 1, name: 'News', slug: 'news', description: '', count: 1 },
          { id: 2, name: 'Updates', slug: 'updates', description: '', count: 1 }
        ],
        tags: [{ id: 3, name: 'General', slug: 'general', description: '', count: 1 }],
        authors: [],
        jetpackStatus: { installed: false, active: false, connected: false, socialAvailable: false },
        seoPluginStatus: {},
        mediaSettings: { mimeTypes: [] },
        recentPosts: []
      }
    });

    const result = await service.recommend({
      siteKey: 'default-site',
      inputText: 'A practical guide to Kubernetes admission control policy design.',
      title: 'Kubernetes Admission Control'
    });

    expect(result.recommendedCategories.every((category) => category.confidence === 'none' || category.confidence === 'low')).toBe(true);
    expect(result.suggestedNewCategory?.name).toBeTruthy();
    expect(result.suggestedNewCategory?.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('flags near-duplicate fallback categories', async () => {
    const mockPrisma = createMockPrisma();
    const configDir = createConfigDir({ fallbackCategories: ['Blog'] });
    const service = new RecommendationService(configDir, { prisma: mockPrisma as any });

    await mockPrisma.wordPressSite.upsert({
      where: { siteKey: 'default-site' },
      create: {
        siteKey: 'default-site',
        name: 'Example',
        siteUrl: 'https://example.com',
        defaultStatus: 'draft'
      },
      update: {}
    });
    await mockPrisma.wordPressSiteSnapshot.create({
      data: {
        wordpressSiteId: 'site-1',
        siteName: 'Example',
        siteUrl: 'https://example.com',
        restApiAvailable: true,
        canCreatePosts: true,
        canPublishPosts: true,
        canUploadMedia: true,
        canCreateCategories: true,
        canCreateTags: true,
        availablePostTypes: [],
        availablePostStatuses: [],
        categories: [
          { id: 1, name: 'Blogs', slug: 'blogs', description: '', count: 1 }
        ],
        tags: [],
        authors: [],
        jetpackStatus: { installed: false, active: false, connected: false, socialAvailable: false },
        seoPluginStatus: {},
        mediaSettings: { mimeTypes: [] },
        recentPosts: []
      }
    });

    const result = await service.recommend({
      siteKey: 'default-site',
      inputText: 'A general note',
      title: 'General Note'
    });

    expect(result.duplicateCategoryCandidates).toContain('Blog');
  });

  it('returns no-space PascalCase tags for generation fallback', async () => {
    const mockPrisma = createMockPrisma();
    const configDir = createConfigDir();
    const service = new RecommendationService(configDir, { prisma: mockPrisma as any });

    const result = await service.recommend({
      siteKey: 'default-site',
      inputText: 'Notes about software engineering and workflow automation.',
      title: 'Software Engineering Workflow'
    });

    expect(result.recommendedTags).toContain('SoftwareEngineering');
    expect(result.recommendedTags).toContain('WorkflowAutomation');
    expect(result.recommendedTags.every((tag) => !tag.includes(' ') && !tag.startsWith('#'))).toBe(true);
  });
});
