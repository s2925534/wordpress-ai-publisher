import {
  discoverySnapshotSchema,
  pluginEnvelopeSchema,
  type DiscoverySnapshot,
  type PluginDiscoveryData
} from '@/lib/discovery-schemas';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { formatTagName, formatTaxonomyName, slugify, taxonomyIdentityKey } from '@/lib/text-utils';
import { ConfigService } from '@/server/config-service';
import { decryptSecret } from '@/server/secret-utils';

type DiscoveryPrismaLike = {
  wordPressSite: {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
  wordPressSiteSnapshot: {
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

type DependencySet = {
  prisma: DiscoveryPrismaLike;
  fetchFn: typeof fetch;
};

type DiscoveredTerm = PluginDiscoveryData['categories'][number];

export type DiscoveryResult = {
  snapshot: DiscoverySnapshot;
  refreshed: boolean;
  source: 'plugin' | 'fallback';
  errorMessage?: string;
};

export class DiscoveryService {
  private readonly configService: ConfigService;

  constructor(
    private readonly configDir: string,
    private readonly deps: DependencySet = { prisma: defaultPrisma, fetchFn: fetch }
  ) {
    this.configService = new ConfigService(configDir);
  }

  async getDefaultSiteRecord() {
    const siteConfig = await this.configService.loadSiteConfig(process.env.DEFAULT_SITE_KEY ?? 'default-site');

    const existing = await this.deps.prisma.wordPressSite.findUnique({
      where: { siteKey: siteConfig.siteKey }
    });
    if (existing) {
      return existing;
    }

    return this.deps.prisma.wordPressSite.upsert({
      where: { siteKey: siteConfig.siteKey },
      update: {},
      create: {
        siteKey: siteConfig.siteKey,
        name: siteConfig.siteName,
        siteUrl: siteConfig.siteUrl,
        siteProtocol: 'https',
        siteHostname: new URL(siteConfig.siteUrl).hostname,
        timezone: null,
        defaultStatus: siteConfig.wordpress.defaultStatus
      }
    });
  }

  async getLatestSnapshot(siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site') {
    const site = await this.getSite(siteKey);

    return this.deps.prisma.wordPressSiteSnapshot.findFirst({
      where: { wordpressSiteId: site.id },
      orderBy: { discoveredAt: 'desc' }
    });
  }

  async refresh(siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site'): Promise<DiscoveryResult> {
    const siteConfig = await this.configService.loadSiteConfig(siteKey);
    const site = await this.getSite(siteKey, siteConfig);
    const siteUrl = this.resolveSiteUrl(site, siteConfig.siteUrl);
    const endpoint = new URL('/wp-json/' + siteConfig.plugin.routeNamespace + '/discovery', siteUrl);

    try {
      const response = await this.deps.fetchFn(endpoint, {
        headers: {
          'x-publisher-token': await this.getPluginToken(site.id)
        }
      });

      if (!response.ok) {
        throw new Error(`Discovery request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const parsedEnvelope = pluginEnvelopeSchema.parse(payload);
      if (!parsedEnvelope.success || !parsedEnvelope.data) {
        throw new Error(parsedEnvelope.error?.message ?? 'Discovery response was unsuccessful');
      }

      const normalized = this.normalizeSnapshot(parsedEnvelope.data, siteUrl, siteConfig);
      const snapshot = discoverySnapshotSchema.parse(normalized);

      await this.deps.prisma.wordPressSiteSnapshot.create({
        data: {
          wordpressSiteId: site.id,
          siteName: snapshot.siteName,
          siteUrl: snapshot.siteUrl,
          timezone: snapshot.timezone ?? null,
          locale: snapshot.locale ?? null,
          restApiAvailable: snapshot.restApiAvailable,
          canCreatePosts: snapshot.canCreatePosts,
          canPublishPosts: snapshot.canPublishPosts,
          canUploadMedia: snapshot.canUploadMedia,
          canCreateCategories: snapshot.canCreateCategories,
          canCreateTags: snapshot.canCreateTags,
          availablePostTypes: snapshot.availablePostTypes,
          availablePostStatuses: snapshot.availablePostStatuses,
          categories: snapshot.categories,
          tags: snapshot.tags,
          authors: snapshot.authors,
          jetpackStatus: snapshot.jetpackStatus,
          seoPluginStatus: snapshot.seoPluginStatus,
          mediaSettings: snapshot.mediaSettings,
          recentPosts: snapshot.recentPosts,
          rawDiscovery: parsedEnvelope.data
        }
      });

      return {
        snapshot,
        refreshed: true,
        source: 'plugin'
      };
    } catch (error) {
      const fallback = this.buildFallbackSnapshot(siteConfig, siteUrl);
      await this.deps.prisma.wordPressSiteSnapshot.create({
        data: {
          wordpressSiteId: site.id,
          siteName: fallback.siteName,
          siteUrl: fallback.siteUrl,
          timezone: fallback.timezone ?? null,
          locale: fallback.locale ?? null,
          restApiAvailable: fallback.restApiAvailable,
          canCreatePosts: fallback.canCreatePosts,
          canPublishPosts: fallback.canPublishPosts,
          canUploadMedia: fallback.canUploadMedia,
          canCreateCategories: fallback.canCreateCategories,
          canCreateTags: fallback.canCreateTags,
          availablePostTypes: fallback.availablePostTypes,
          availablePostStatuses: fallback.availablePostStatuses,
          categories: fallback.categories,
          tags: fallback.tags,
          authors: fallback.authors,
          jetpackStatus: fallback.jetpackStatus,
          seoPluginStatus: fallback.seoPluginStatus,
          mediaSettings: fallback.mediaSettings,
          recentPosts: fallback.recentPosts,
          rawDiscovery: {
            source: 'fallback',
            message: error instanceof Error ? error.message : 'Unknown discovery failure'
          }
        }
      });

      return {
        snapshot: fallback,
        refreshed: false,
        source: 'fallback',
        errorMessage: error instanceof Error ? error.message : 'Unknown discovery failure'
      };
    }
  }

  private async getSite(siteKey: string, siteConfig?: Awaited<ReturnType<ConfigService['loadSiteConfig']>>) {
    const config = siteConfig ?? (await this.configService.loadSiteConfig(siteKey));
    const existing = await this.deps.prisma.wordPressSite.findUnique({
      where: { siteKey }
    });
    if (existing) {
      return existing;
    }

    return this.deps.prisma.wordPressSite.upsert({
      where: { siteKey },
      update: {},
      create: {
        siteKey,
        name: config.siteName,
        siteUrl: config.siteUrl,
        siteProtocol: 'https',
        siteHostname: new URL(config.siteUrl).hostname,
        timezone: null,
        defaultStatus: config.wordpress.defaultStatus
      }
    });
  }

  private async getPluginToken(siteId: string) {
    const site = await this.deps.prisma.wordPressSite.findUnique({
      where: { id: siteId }
    });

    return decryptSecret(site?.encryptedPluginToken);
  }

  private resolveSiteUrl(site: { siteUrl?: string | null }, fallbackSiteUrl: string) {
    return site.siteUrl?.trim() || fallbackSiteUrl;
  }

  private normalizeSnapshot(
    data: PluginDiscoveryData,
    fallbackSiteUrl: string,
    siteConfig: Awaited<ReturnType<ConfigService['loadSiteConfig']>>
  ) {
    const categories = this.normalizeCategoryTerms(data.categories);

    return {
      siteName: data.siteInfo.siteName,
      siteUrl: data.siteInfo.siteUrl ?? fallbackSiteUrl,
      timezone: data.siteInfo.timezone ?? null,
      locale: data.siteInfo.locale ?? null,
      restApiAvailable: data.siteInfo.restApiAvailable ?? true,
      canCreatePosts: data.canCreatePosts,
      canPublishPosts: data.canPublishPosts,
      canUploadMedia: data.canUploadMedia,
      canCreateCategories: data.canCreateCategories,
      canCreateTags: data.canCreateTags,
      availablePostTypes: data.availablePostTypes,
      availablePostStatuses: data.availablePostStatuses,
      categories,
      tags: this.normalizeTagTerms(data.tags, [
        ...siteConfig.tags.preferred,
        ...siteConfig.hashtags.preferred,
        ...categories.map((category) => category.name)
      ]),
      authors: data.authors,
      recentPosts: data.recentPosts.map((post) => {
        const slug = this.resolveRecentPostSlug(post);

        return {
          ...post,
          slug,
          url: post.url?.trim() ? post.url : new URL(`/${slug}`, fallbackSiteUrl).toString()
        };
      }),
      jetpackStatus: data.jetpackStatus,
      seoPluginStatus: data.seoPluginStatus,
      mediaSettings: data.mediaSettings
    };
  }

  private buildFallbackSnapshot(
    siteConfig: Awaited<ReturnType<ConfigService['loadSiteConfig']>>,
    fallbackSiteUrl: string
  ) {
    return discoverySnapshotSchema.parse({
      siteName: siteConfig.siteName,
      siteUrl: fallbackSiteUrl,
      timezone: null,
      locale: null,
      restApiAvailable: false,
      canCreatePosts: false,
      canPublishPosts: false,
      canUploadMedia: false,
      canCreateCategories: false,
      canCreateTags: false,
      availablePostTypes: [],
      availablePostStatuses: [],
      categories: [],
      tags: [],
      authors: [],
      recentPosts: [],
      jetpackStatus: {
        installed: false,
        active: false,
        connected: false,
        socialAvailable: false
      },
      seoPluginStatus: {},
      mediaSettings: {
        mimeTypes: []
      }
    });
  }

  private normalizeCategoryTerms(terms: DiscoveredTerm[]) {
    return dedupeTerms(
      terms.map((term) => ({
        ...term,
        name: formatTaxonomyName(term.name)
      })),
      (term) => taxonomyIdentityKey(term.name)
    );
  }

  private normalizeTagTerms(terms: DiscoveredTerm[], aliases: string[]) {
    const aliasByKey = new Map(
      aliases.map((alias) => [taxonomyIdentityKey(alias), formatTagName(alias)])
    );

    return dedupeTerms(
      terms.map((term) => {
        const name = aliasByKey.get(taxonomyIdentityKey(term.name)) ?? formatTagName(term.name);

        return {
          ...term,
          name,
          slug: term.slug?.trim() || slugify(name)
        };
      }),
      (term) => taxonomyIdentityKey(term.name)
    );
  }

  private resolveRecentPostSlug(post: {
    slug?: string | null;
    title: string;
    id: number;
    url?: string | null;
  }) {
    const slug = post.slug?.trim();
    if (slug) {
      return slug;
    }

    if (post.url) {
      try {
        const pathname = new URL(post.url).pathname.replace(/\/+$/, '');
        const fromPath = pathname.split('/').filter(Boolean).at(-1)?.trim();
        if (fromPath) {
          return fromPath;
        }
      } catch {
        // Fall through to title/id based fallback.
      }
    }

    const titleSlug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return titleSlug || `post-${post.id}`;
  }
}

function dedupeTerms<T extends { count?: number; name: string }>(
  terms: T[],
  getKey: (term: T) => string
) {
  const byKey = new Map<string, T>();

  for (const term of terms) {
    const key = getKey(term);
    const existing = byKey.get(key);

    if (!existing || scoreTermVariant(term) > scoreTermVariant(existing)) {
      byKey.set(key, term);
    }
  }

  return Array.from(byKey.values());
}

function scoreTermVariant(term: { count?: number; name: string }) {
  return (
    (term.count ?? 0) * 10 +
    (/[A-Z]/.test(term.name) ? 2 : 0) +
    (/\s/.test(term.name) ? 1 : 0)
  );
}
