import type { PrismaClient } from '@prisma/client';

import { generatedPackageResponseSchema, type GeneratedPackageResponse } from '@/lib/generation-schemas';
import { buildImageFileName, hasValidAltText, validateAltText } from '@/lib/image-utils';
import { packageUpdateSchema, publishRequestSchema, type PackageUpdate, type PublishRequest } from '@/lib/publish-schemas';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { WordPressService } from '@/server/wordpress-service';
import { ConfigService } from '@/server/config-service';
import { createDefaultContentProfile, createDefaultSiteConfig } from '@/server/default-config';
import { MockAIProvider, type AIProvider } from '@/server/ai-provider';
import { RecommendationService } from '@/server/recommendation-service';
import type { SourceSafetyType } from '@/lib/ai-schemas';

type PackageRecord = GeneratedPackageResponse & {
  id: string;
  generationRequestId: string;
};

type PackageDeps = {
  prisma?: PrismaClient;
  fetchFn?: typeof fetch;
  aiProvider?: AIProvider;
};

export class PackageService {
  private readonly prisma: PrismaClient;
  private readonly configService: ConfigService;
  private readonly recommendationService: RecommendationService;
  private readonly wordpressService: WordPressService;
  private readonly aiProvider: AIProvider;

  constructor(private readonly configDir: string, deps: PackageDeps = {}) {
    this.prisma = deps.prisma ?? defaultPrisma;
    this.configService = new ConfigService(configDir);
    this.recommendationService = new RecommendationService(configDir, {
      prisma: this.prisma,
      fetchFn: deps.fetchFn
    });
    this.wordpressService = new WordPressService({ fetchFn: deps.fetchFn });
    this.aiProvider = deps.aiProvider ?? new MockAIProvider();
  }

  async generate(input: {
    inputText: string;
    sourceSafetyType: SourceSafetyType;
    siteKey?: string;
    contentProfileKey?: string;
  }) {
    const siteConfig = await this.loadSiteConfig(input.siteKey);
    const contentProfile = await this.loadContentProfile(input.contentProfileKey);

    const generated = await this.aiProvider.generatePublicationPackage({
      inputText: input.inputText,
      sourceSafetyType: input.sourceSafetyType,
      siteConfig,
      contentProfile
    });

    const recommendations = await this.recommendationService.recommend({
      siteKey: siteConfig.siteKey,
      inputText: input.inputText,
      title: generated.title,
      tags: generated.recommendedTags
    });

    const normalized = generatedPackageResponseSchema.parse({
      ...generated,
      recommendedCategories: recommendations.recommendedCategories.length
        ? recommendations.recommendedCategories
        : generated.recommendedCategories,
      recommendedTags: recommendations.recommendedTags.length
        ? recommendations.recommendedTags
        : generated.recommendedTags,
      plainCsvTags: recommendations.recommendedTags.length
        ? recommendations.recommendedTags.join(', ')
        : generated.plainCsvTags,
      tagRecommendations: recommendations.tagRecommendations,
      suggestedNewCategory: recommendations.suggestedNewCategory
    });

    const request = await this.prisma.generationRequest.create({
      data: {
        inputText: input.inputText,
        sourceSafetyType: input.sourceSafetyType,
        contentProfileId: await this.resolveContentProfileId(contentProfile.profileKey),
        wordpressSiteId: await this.resolveSiteId(siteConfig.siteKey),
        status: 'ready'
      }
    });

    const packageRecord = await this.prisma.generatedPublicationPackage.create({
      data: {
        generationRequestId: request.id,
        wordpressSiteId: await this.resolveSiteId(siteConfig.siteKey),
        contentProfileId: await this.resolveContentProfileId(contentProfile.profileKey),
        title: normalized.title,
        linkedinPost: normalized.linkedinPost,
        excerpt: normalized.excerpt,
        plainCsvTags: normalized.plainCsvTags,
        recommendedCategories: normalized.recommendedCategories,
        recommendedTags: normalized.recommendedTags,
        featureImagePrompt: normalized.featureImagePrompt ?? null,
        altText: normalized.altText ?? '',
        suggestedImageFileName: normalized.suggestedImageFileName ?? buildImageFileName(normalized.title),
        seoPackage: normalized.seoPackage,
        status: 'ready'
      }
    });

    return {
      ...normalized,
      packageId: packageRecord.id,
      generationRequestId: request.id
    };
  }

  async prepareImage(packageId: string) {
    const record = await this.getPackageRecord(packageId);
    const siteConfig = await this.loadSiteConfigBySiteId(record.wordpressSiteId);
    const imagePrompt = record.featureImagePrompt ?? (await this.aiProvider.generateImagePrompt({
      inputText: record.linkedinPost,
      sourceSafetyType: 'notes_only',
      siteConfig,
      contentProfile: await this.loadContentProfileBySiteId(record.contentProfileId),
      title: record.title
    }));

    const altText = record.altText || (await this.aiProvider.generateAltText({
      inputText: record.linkedinPost,
      sourceSafetyType: 'notes_only',
      siteConfig,
      contentProfile: await this.loadContentProfileBySiteId(record.contentProfileId),
      title: record.title,
      imagePrompt
    }));

    const altTextState = validateAltText(altText);
    if (!altTextState.valid) {
      throw new Error(altTextState.reason);
    }

    const image = await this.aiProvider.generateImage({
      inputText: record.linkedinPost,
      sourceSafetyType: 'notes_only',
      siteConfig,
      contentProfile: await this.loadContentProfileBySiteId(record.contentProfileId),
      title: record.title
    });

    const imageUrl = image.imageUrl ?? null;
    const suggestedImageFileName = buildImageFileName(record.title);

    const generatedImage = await this.prisma.generatedImage.create({
      data: {
        generatedPackageId: record.id,
        imagePrompt,
        localImageUrl: imageUrl,
        imageFilename: suggestedImageFileName,
        altText,
        altTextStatus: 'approved',
        imageApprovalStatus: 'approved'
      }
    });

    await this.prisma.generatedPublicationPackage.update({
      where: { id: record.id },
      data: {
        featureImagePrompt: imagePrompt,
        featureImageUrl: imageUrl,
        altText,
        suggestedImageFileName
      }
    });

    return { generatedImage, imageUrl, altText, suggestedImageFileName };
  }

  async updatePackage(packageId: string, patch: PackageUpdate) {
    const parsed = packageUpdateSchema.parse(patch);
    const record = await this.getPackageRecord(packageId);
    const updated = await this.prisma.generatedPublicationPackage.update({
      where: { id: record.id },
      data: {
        ...('title' in parsed ? { title: parsed.title } : {}),
        ...('linkedinPost' in parsed ? { linkedinPost: parsed.linkedinPost } : {}),
        ...('excerpt' in parsed ? { excerpt: parsed.excerpt } : {}),
        ...('plainCsvTags' in parsed ? { plainCsvTags: parsed.plainCsvTags } : {}),
        ...('altText' in parsed ? { altText: parsed.altText } : {}),
        ...('suggestedImageFileName' in parsed ? { suggestedImageFileName: parsed.suggestedImageFileName } : {}),
        ...('seoPackage' in parsed ? { seoPackage: parsed.seoPackage } : {})
      }
    });

    return updated;
  }

  async publish(input: PublishRequest) {
    const parsed = publishRequestSchema.parse(input);
    const record = await this.getPackageRecord(parsed.packageId);
    const site = await this.resolveSiteById(record.wordpressSiteId);
    const siteConfig = await this.loadSiteConfigBySiteId(record.wordpressSiteId);
    const siteRecord = await this.prisma.wordPressSite.findUnique({ where: { id: site.id } });
    const existingAttempt = await this.prisma.publishingAttempt.findUnique({
      where: { idempotencyKey: parsed.idempotencyKey }
    });

    if (existingAttempt) {
      return existingAttempt;
    }

    const imageValidation = hasValidAltText(parsed.featuredMediaAltText ?? record.altText);
    if (!imageValidation) {
      throw new Error('Alt text is required before assigning a featured image.');
    }

    let categoryIds = parsed.selectedCategoryIds;
    if (parsed.confirmNewCategory && parsed.newCategoryName && parsed.newCategorySlug) {
      const createdCategory = await this.wordpressService.createCategory(
        siteConfig,
        parsed.newCategoryName,
        parsed.newCategorySlug,
        siteRecord as any
      );
      categoryIds = [...categoryIds, Number(createdCategory.data?.id ?? createdCategory.id ?? 0)].filter(Boolean);
    } else if (parsed.confirmNewCategory) {
      throw new Error('A new category name and slug are required when confirming category creation.');
    }

    let featuredMediaId: number | undefined;
    if (parsed.featuredMediaUrl || record.featureImageUrl) {
      const uploadResult = await this.wordpressService.uploadMedia(
        siteConfig,
        {
          url: parsed.featuredMediaUrl ?? record.featureImageUrl ?? '',
          altText: parsed.featuredMediaAltText ?? record.altText,
          caption: record.title,
          description: record.excerpt
        },
        siteRecord as any
      );
      featuredMediaId = Number(uploadResult.data?.mediaId ?? uploadResult.mediaId ?? 0) || undefined;
    }

    const action = parsed.action;
    const draftResult = await this.wordpressService.createDraft(
      siteConfig,
      {
        title: record.title,
        content: record.linkedinPost,
        excerpt: record.excerpt,
        slug: record.seoPackage.slug,
        status: action === 'publish' ? 'draft' : action === 'schedule' ? 'future' : 'draft',
        categories: categoryIds,
        tags: parsed.selectedTagNames.length ? parsed.selectedTagNames : record.recommendedTags,
        featuredMediaId
      },
      siteRecord as any
    );

    let finalResult = draftResult;
    if (action === 'publish') {
      finalResult = await this.wordpressService.publishPost(
        siteConfig,
        Number(draftResult.data?.postId ?? draftResult.postId),
        siteRecord as any
      );
    }

    const jetpackStatus = await this.safeJetpackStatus(siteConfig, siteRecord as any);

    const attempt = await this.prisma.publishingAttempt.create({
      data: {
        generatedPackageId: record.id,
        wordpressSiteId: site.id,
        idempotencyKey: parsed.idempotencyKey,
        wordpressStatus: action === 'publish' ? 'publish' : action === 'schedule' ? 'future' : 'draft',
        wordpressPostId: Number(finalResult.data?.postId ?? finalResult.postId ?? draftResult.data?.postId ?? draftResult.postId),
        wordpressPostUrl: finalResult.data?.postUrl ?? finalResult.postUrl ?? draftResult.data?.postUrl ?? draftResult.postUrl ?? '',
        socialStatus: jetpackStatus.socialAvailable ? 'skipped' : 'unavailable',
        socialProvider: 'jetpack',
        selectedSocialConnections: [],
        requestPayloadSnapshot: parsed,
        responseSnapshot: {
          draftResult,
          finalResult,
          jetpackStatus
        }
      }
    });

    return attempt;
  }

  async getPackage(packageId: string) {
    const record = await this.prisma.generatedPublicationPackage.findUnique({
      where: { id: packageId },
      include: {
        generatedImages: true,
        publishingAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    if (!record) {
      throw new Error('Package not found.');
    }
    return record;
  }

  private async safeJetpackStatus(siteConfig: Awaited<ReturnType<PackageService['loadSiteConfigBySiteId']>>, siteRecord?: any) {
    try {
      const result = await this.wordpressService.getJetpackStatus(siteConfig, siteRecord);
      return result.data?.jetpackStatus ?? result.jetpackStatus ?? {
        installed: false,
        active: false,
        connected: false,
        socialAvailable: false
      };
    } catch {
      return {
        installed: false,
        active: false,
        connected: false,
        socialAvailable: false
      };
    }
  }

  private async getPackageRecord(packageId: string) {
    const record = await this.prisma.generatedPublicationPackage.findUnique({
      where: { id: packageId }
    });
    if (!record) {
      throw new Error('Package not found.');
    }
    return record as any;
  }

  private async resolveSiteId(siteKey: string) {
    const site = await this.prisma.wordPressSite.findUnique({ where: { siteKey } });
    if (site) {
      return site.id;
    }
    const config = await this.loadSiteConfig(siteKey);
    const created = await this.prisma.wordPressSite.upsert({
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
    return created.id;
  }

  private async resolveSiteById(siteId: string) {
    const site = await this.prisma.wordPressSite.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new Error('Site not found.');
    }
    return site;
  }

  private async resolveContentProfileId(profileKey: string) {
    const profile = await this.prisma.contentProfile.findUnique({ where: { profileKey } });
    if (profile) {
      return profile.id;
    }
    const profileConfig = await this.loadContentProfile(profileKey);
    const created = await this.prisma.contentProfile.upsert({
      where: { profileKey },
      create: {
        profileKey,
        name: profileConfig.name,
        description: profileConfig.description,
        outputOrder: profileConfig.outputOrder,
        writingRules: profileConfig.writingStyle,
        hashtagRules: profileConfig.sections.linkedinPost,
        categoryRules: profileConfig.sections.recommendedCategories,
        imageRules: profileConfig.sections.featureImage,
        seoRules: profileConfig.sections.title,
        urlRules: profileConfig.sections.suggestedImageFileName,
        qualityRules: profileConfig.sections.excerpt,
        isDefault: false
      },
      update: {
        name: profileConfig.name,
        description: profileConfig.description,
        outputOrder: profileConfig.outputOrder,
        writingRules: profileConfig.writingStyle,
        hashtagRules: profileConfig.sections.linkedinPost,
        categoryRules: profileConfig.sections.recommendedCategories,
        imageRules: profileConfig.sections.featureImage,
        seoRules: profileConfig.sections.title,
        urlRules: profileConfig.sections.suggestedImageFileName,
        qualityRules: profileConfig.sections.excerpt
      }
    });
    return created.id;
  }

  private async loadSiteConfig(siteKey?: string) {
    const resolvedSiteKey = siteKey ?? process.env.DEFAULT_SITE_KEY ?? 'default-site';
    const baseConfig = await this.loadSiteConfigFile(resolvedSiteKey);
    const site = await this.prisma.wordPressSite.findUnique({ where: { siteKey: resolvedSiteKey } });

    return site ? applySiteRecordToConfig(baseConfig, site) : baseConfig;
  }

  private async loadSiteConfigFile(siteKey: string) {
    if (!siteKey) {
      return createDefaultSiteConfig(process.env.APP_URL ?? 'http://localhost:3000');
    }
    try {
      return await this.configService.loadSiteConfig(siteKey);
    } catch {
      return createDefaultSiteConfig(process.env.APP_URL ?? 'http://localhost:3000');
    }
  }

  private async loadSiteConfigBySiteId(siteId: string) {
    const site = await this.resolveSiteById(siteId);
    const config = await this.loadSiteConfigFile(site.siteKey);
    return applySiteRecordToConfig(config, site);
  }

  private async loadContentProfile(profileKey?: string) {
    if (!profileKey) {
      return createDefaultContentProfile();
    }
    try {
      return await this.configService.loadContentProfile(profileKey);
    } catch {
      return createDefaultContentProfile();
    }
  }

  private async loadContentProfileBySiteId(contentProfileId: string) {
    const profile = await this.prisma.contentProfile.findUnique({ where: { id: contentProfileId } });
    if (!profile) {
      return createDefaultContentProfile();
    }
    return this.loadContentProfile(profile.profileKey);
  }
}

function applySiteRecordToConfig(config: Awaited<ReturnType<ConfigService['loadSiteConfig']>>, site: any) {
  const siteUrl = site.siteUrl || config.siteUrl;
  const hostname = safeHostname(siteUrl);
  const siteName = isPlaceholderSiteName(site.name) ? hostname : site.name || hostname || config.siteName;
  const displayName = isPlaceholderSiteName(config.brand.displayName)
    ? siteName
    : config.brand.displayName;
  const positioning = isGenericPositioning(config.brand.positioning)
    ? `Publishing site at ${hostname || siteName}.`
    : config.brand.positioning;

  return {
    ...config,
    siteName,
    siteUrl,
    brand: {
      ...config.brand,
      displayName,
      positioning
    }
  };
}

function safeHostname(siteUrl: string) {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  }
}

function isPlaceholderSiteName(value?: string | null) {
  if (!value) return true;
  return ['default site', 'example wordpress site', 'example site'].includes(value.trim().toLowerCase());
}

function isGenericPositioning(value?: string | null) {
  return !value || value.trim().toLowerCase() === 'a professional wordpress publishing site.';
}
