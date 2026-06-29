import { createHash } from 'node:crypto';

import { contentProfileSchema, siteConfigSchema } from '@/lib/config-schemas';

function humanizeHostname(hostname: string) {
  return hostname
    .replace(/^www\./i, '')
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSiteUrl(input: string) {
  const parsed = new URL(input);
  return parsed.origin;
}

export function createDefaultSiteConfig(inputUrl: string) {
  const normalizedUrl = normalizeSiteUrl(inputUrl);
  const hostname = new URL(normalizedUrl).hostname;
  const siteName = humanizeHostname(hostname) || 'Default Site';

  return siteConfigSchema.parse({
    siteKey: 'default-site',
    siteName,
    siteUrl: normalizedUrl,
    wordpress: {
      defaultStatus: 'draft',
      allowPublish: false,
      allowSchedule: true,
      allowCategoryCreation: true,
      allowTagCreation: true,
      preferExistingCategories: true,
      preferExistingTags: true
    },
    plugin: {
      routeNamespace: 'publisher/v1',
      requiresToken: true
    },
    brand: {
      displayName: siteName,
      positioning: 'A professional WordPress publishing site.',
      audiences: ['professionals', 'technical readers', 'business readers'],
      preferredTone: ['professional', 'clear', 'credible', 'practical'],
      avoidTone: ['hype', 'clickbait', 'robotic wording', 'generic corporate jargon']
    },
    contentPackage: {
      outputOrder: [
        'Title',
        'LinkedIn Post',
        'Excerpt',
        'Plain CSV Tags',
        'Recommended Categories',
        'Feature Image',
        'Alt Text',
        'Suggested Image File Name'
      ],
      maxCharacters: 8000,
      linkedinPostMustEndWithHashtags: true
    },
    hashtags: {
      alwaysInclude: [],
      preferred: [
        '#SoftwareEngineering',
        '#SoftwareArchitecture',
        '#ArtificialIntelligence',
        '#PlatformEngineering',
        '#CloudInfrastructure',
        '#DistributedSystems',
        '#Interoperability',
        '#DevSecOps',
        '#WorkflowAutomation',
        '#EngineeringLeadership',
        '#CyberSecurity',
        '#TechnologyStrategy',
        '#DeveloperTools'
      ],
      maxHashtags: 12
    },
    tags: {
      alwaysConsider: [],
      preferred: [
        'software engineering',
        'software architecture',
        'interoperability',
        'distributed systems',
        'platform engineering',
        'cloud infrastructure',
        'workflow automation',
        'developer tools',
        'engineering leadership',
        'technology strategy'
      ],
      minTags: 5,
      maxTags: 12
    },
    categories: {
      mode: 'discover_live_first',
      fallbackCategories: [],
      avoidUnlessExplicit: ['Uncategorized'],
      allowSuggestedNewCategory: true,
      requireConfirmationBeforeCreate: true
    },
    seo: {
      generateSeoTitle: true,
      generateMetaDescription: true,
      generatePrimaryKeyword: true,
      generateSecondaryKeywords: true,
      generateSlug: true,
      titleTargetLength: {
        min: 45,
        max: 65
      },
      metaDescriptionTargetLength: {
        min: 140,
        max: 160
      },
      avoidKeywordStuffing: true,
      suggestInternalLinks: true
    },
    image: {
      generateFeatureImage: true,
      requireAltText: true,
      allowNoImage: true,
      style: ['professional', 'modern', 'technology-oriented', 'meaningful', 'visually strong'],
      avoid: [
        'generic stock-photo style',
        'excessive blue unless requested',
        'overcrowded diagrams',
        'text-heavy graphics unless requested'
      ],
      filenameFormat: 'lowercase-hyphenated'
    },
    urlRules: {
      allowSiteUrlMentions: [],
      doNotMentionAsUrl: []
    },
    jetpack: {
      enabled: true,
      socialSharingOptional: true,
      continueIfUnavailable: true
    }
  });
}

export function createDefaultContentProfile() {
  return contentProfileSchema.parse({
    profileKey: 'linkedin-blog-package',
    name: 'LinkedIn + WordPress Blog Package',
    description: 'Generates a LinkedIn-ready post and WordPress-ready publication package.',
    outputOrder: [
      'Title',
      'LinkedIn Post',
      'Excerpt',
      'Plain CSV Tags',
      'Recommended Categories',
      'Feature Image',
      'Alt Text',
      'Suggested Image File Name'
    ],
    writingStyle: {
      prefer: [
        'technically mature',
        'practical',
        'credible',
        'specific',
        'professionally structured'
      ],
      avoid: [
        'robotic AI wording',
        'shallow motivation',
        'excessive hype',
        'generic corporate jargon',
        'clickbait'
      ]
    },
    sections: {
      title: {
        required: true,
        seoFriendly: true
      },
      linkedinPost: {
        required: true,
        shortParagraphs: true,
        mustEndWithHashtags: true
      },
      excerpt: {
        required: true,
        maxParagraphs: 3
      },
      plainCsvTags: {
        required: true,
        noHashtags: true
      },
      recommendedCategories: {
        required: true,
        useSiteCategories: true
      },
      featureImage: {
        required: false,
        generatePrompt: true,
        generateImage: true
      },
      altText: {
        requiredWhenImageExists: true
      },
      suggestedImageFileName: {
        requiredWhenImageExists: true,
        format: 'lowercase-hyphenated'
      }
    }
  });
}

export function buildConfigFingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
