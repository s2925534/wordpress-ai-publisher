import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';
import { PackageService } from '@/server/package-service';

function createMockPrisma() {
  const sites: Array<any> = [];
  const profiles: Array<any> = [];
  const requests: Array<any> = [];
  const packages: Array<any> = [];
  const images: Array<any> = [];
  const attempts: Array<any> = [];
  const snapshots: Array<any> = [];

  return {
    wordPressSite: {
      async findUnique({ where }: any) {
        return sites.find((site) => site.id === where.id || site.siteKey === where.siteKey) ?? null;
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
    },
    contentProfile: {
      async findUnique({ where }: any) {
        return profiles.find((profile) => profile.id === where.id || profile.profileKey === where.profileKey) ?? null;
      },
      async upsert({ where, create, update }: any) {
        let existing = profiles.find((profile) => profile.profileKey === where.profileKey);
        if (!existing) {
          existing = { id: `profile-${profiles.length + 1}`, ...create };
          profiles.push(existing);
          return existing;
        }
        Object.assign(existing, update);
        return existing;
      }
    },
    generationRequest: {
      async create({ data }: any) {
        const record = { id: `request-${requests.length + 1}`, ...data };
        requests.push(record);
        return record;
      }
    },
    generatedPublicationPackage: {
      async create({ data }: any) {
        const record = {
          id: `package-${packages.length + 1}`,
          generatedImages: [],
          publishingAttempts: [],
          ...data
        };
        packages.push(record);
        return record;
      },
      async update({ where, data }: any) {
        const existing = packages.find((item) => item.id === where.id);
        Object.assign(existing, data);
        return existing;
      },
      async findUnique({ where }: any) {
        return packages.find((item) => item.id === where.id) ?? null;
      }
    },
    wordPressSiteSnapshot: {
      async findFirst({ where }: any) {
        return snapshots.filter((snapshot) => snapshot.wordpressSiteId === where.wordpressSiteId).at(-1) ?? null;
      },
      async create({ data }: any) {
        const record = { id: `snapshot-${snapshots.length + 1}`, discoveredAt: new Date(), ...data };
        snapshots.push(record);
        return record;
      }
    },
    generatedImage: {
      async create({ data }: any) {
        const record = { id: `image-${images.length + 1}`, ...data };
        images.push(record);
        return record;
      }
    },
    publishingAttempt: {
      async findUnique({ where }: any) {
        return attempts.find((attempt) => attempt.idempotencyKey === where.idempotencyKey) ?? null;
      },
      async create({ data }: any) {
        const record = { id: `attempt-${attempts.length + 1}`, ...data };
        attempts.push(record);
        return record;
      }
    },
    __state: { sites, profiles, requests, packages, images, attempts, snapshots }
  };
}

function createConfigDir() {
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'wap-package-'));
  mkdirSync(path.join(configDir, 'sites'), { recursive: true });
  mkdirSync(path.join(configDir, 'content-profiles'), { recursive: true });
  writeFileSync(path.join(configDir, 'sites', 'default-site.json'), JSON.stringify(createDefaultSiteConfig('https://example.com')));
  writeFileSync(path.join(configDir, 'content-profiles', 'linkedin-blog-package.json'), JSON.stringify(createDefaultContentProfile()));
  return configDir;
}

describe('PackageService', () => {
  it('stores generated packages and returns a package id', async () => {
    const prisma = createMockPrisma();
    const service = new PackageService(createConfigDir(), { prisma: prisma as any });

    const result = await service.generate({
      inputText: 'A practical draft about content workflows and publication controls.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    expect(result.packageId).toBeTruthy();
    expect(prisma.__state.packages).toHaveLength(1);
  });

  it('prepares an image and updates the stored package', async () => {
    const prisma = createMockPrisma();
    const service = new PackageService(createConfigDir(), { prisma: prisma as any });

    const generated = await service.generate({
      inputText: 'A practical draft about image handling for WordPress publishing.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    const image = await service.prepareImage(generated.packageId ?? '');

    expect(image.imageUrl).toContain('mock://image/');
    expect(prisma.__state.images).toHaveLength(1);
  });

  it('creates a draft and reuses the idempotency key on retry', async () => {
    const prisma = createMockPrisma();
    const requests: Array<{ url: string; method?: string }> = [];
    const service = new PackageService(createConfigDir(), {
      prisma: prisma as any,
      fetchFn: async (input, init) => {
        requests.push({ url: input.toString(), method: init?.method });
        const url = input.toString();
        if (url.includes('/jetpack/status')) {
          return new Response(JSON.stringify({ success: true, data: { jetpackStatus: { installed: false, active: false, connected: false, socialAvailable: false } } }), { status: 200 });
        }
        if (url.includes('/posts') && init?.method === 'POST' && !url.includes('/publish')) {
          return new Response(JSON.stringify({ success: true, data: { postId: 123, postUrl: 'https://example.com/?p=123', status: 'draft' } }), { status: 200 });
        }
        if (url.includes('/publish')) {
          return new Response(JSON.stringify({ success: true, data: { postId: 123, postUrl: 'https://example.com/?p=123', status: 'publish' } }), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
      }
    });

    const generated = await service.generate({
      inputText: 'A practical draft about WordPress publishing workflows.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    const first = await service.publish({
      packageId: generated.packageId ?? '',
      action: 'draft',
      confirmNewCategory: false,
      confirmPublish: true,
      confirmImageApproval: true,
      idempotencyKey: 'idempotency-key-1',
      selectedCategoryIds: [],
      selectedTagNames: []
    });

    const second = await service.publish({
      packageId: generated.packageId ?? '',
      action: 'draft',
      confirmNewCategory: false,
      confirmPublish: true,
      confirmImageApproval: true,
      idempotencyKey: 'idempotency-key-1',
      selectedCategoryIds: [],
      selectedTagNames: []
    });

    expect(first.idempotencyKey).toBe('idempotency-key-1');
    expect(second.idempotencyKey).toBe('idempotency-key-1');
    expect(prisma.__state.attempts).toHaveLength(1);
    expect(requests.some((request) => request.url.includes('/posts'))).toBe(true);
  });

  it('keeps draft creation working when Jetpack status is unavailable', async () => {
    const prisma = createMockPrisma();
    const service = new PackageService(createConfigDir(), {
      prisma: prisma as any,
      fetchFn: async (input, init) => {
        const url = input.toString();
        if (url.includes('/posts') && init?.method === 'POST' && !url.includes('/publish')) {
          return new Response(JSON.stringify({ success: true, data: { postId: 321, postUrl: 'https://example.com/?p=321', status: 'draft' } }), { status: 200 });
        }
        if (url.includes('/publish')) {
          return new Response(JSON.stringify({ success: true, data: { postId: 321, postUrl: 'https://example.com/?p=321', status: 'publish' } }), { status: 200 });
        }
        throw new Error('Jetpack unavailable');
      }
    });

    const generated = await service.generate({
      inputText: 'A practical draft about resilience when social integrations are unavailable.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    const attempt = await service.publish({
      packageId: generated.packageId ?? '',
      action: 'draft',
      confirmNewCategory: false,
      confirmPublish: true,
      confirmImageApproval: true,
      idempotencyKey: 'idempotency-key-2',
      selectedCategoryIds: [],
      selectedTagNames: []
    });

    expect(attempt.wordpressStatus).toBe('draft');
    expect(attempt.socialStatus).toBe('unavailable');
    expect(prisma.__state.attempts).toHaveLength(1);
  });

  it('rejects image assignment when alt text is missing', async () => {
    const prisma = createMockPrisma();
    const service = new PackageService(createConfigDir(), { prisma: prisma as any });

    const generated = await service.generate({
      inputText: 'A practical draft about image accessibility and review controls.',
      sourceSafetyType: 'notes_only',
      siteKey: 'default-site',
      contentProfileKey: 'linkedin-blog-package'
    });

    await expect(
      service.publish({
        packageId: generated.packageId ?? '',
        action: 'draft',
        confirmNewCategory: false,
        confirmPublish: true,
        confirmImageApproval: true,
        idempotencyKey: 'idempotency-key-3',
        selectedCategoryIds: [],
        selectedTagNames: [],
        featuredMediaAltText: '   '
      })
    ).rejects.toThrow('Alt text is required before assigning a featured image.');
  });
});
