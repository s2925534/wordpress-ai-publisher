import { prisma as defaultPrisma } from '@/lib/prisma';
import { DiscoveryService } from '@/server/discovery-service';
import { ConfigService } from '@/server/config-service';

type SiteTerm = {
  id?: number;
  name: string;
  slug?: string;
  description?: string | null;
  count?: number;
};

type RecommendationInput = {
  siteKey?: string;
  inputText: string;
  title?: string;
  tags?: string[];
};

type CategoryRecommendation = {
  name: string;
  slug?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  existingCategoryId?: number;
};

type TagRecommendation = {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  existingTagId?: number;
};

type RecommendationResult = {
  recommendedCategories: CategoryRecommendation[];
  suggestedNewCategory?: { name: string; slug: string; reason: string };
  recommendedTags: string[];
  tagRecommendations: TagRecommendation[];
  duplicateCategoryCandidates: string[];
};

export class RecommendationService {
  private readonly configService: ConfigService;
  private readonly discoveryService: DiscoveryService;

  constructor(
    private readonly configDir: string,
    private readonly deps: { prisma?: any; fetchFn?: typeof fetch } = {}
  ) {
    this.configService = new ConfigService(configDir);
    this.discoveryService = new DiscoveryService(configDir, {
      prisma: this.deps.prisma ?? defaultPrisma,
      fetchFn: this.deps.fetchFn ?? fetch
    });
  }

  async recommend(input: RecommendationInput): Promise<RecommendationResult> {
    const siteKey = input.siteKey ?? process.env.DEFAULT_SITE_KEY ?? 'default-site';
    const siteConfig = await this.configService.loadSiteConfig(siteKey);
    const snapshot = await this.discoveryService.getLatestSnapshot(siteKey);
    const text = [input.title, input.inputText, ...(input.tags ?? [])].filter(Boolean).join(' ');
    const liveCategories = toArray<SiteTerm>(snapshot?.categories);
    const liveTags = toArray<SiteTerm>(snapshot?.tags);
    const tokens = tokenize(text);

    const categoryScores = liveCategories.map((category) => ({
      category,
      score: scoreCategory(category, tokens, input)
    }));

    categoryScores.sort((left, right) => right.score - left.score);
    const topCategory = categoryScores[0];
    const recommendedCategories = categoryScores
      .filter((entry) => entry.score > 0)
      .slice(0, 3)
      .map(({ category, score }) => {
        const confidence: CategoryRecommendation['confidence'] =
          score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';

        return {
          name: category.name,
          slug: category.slug,
          existingCategoryId: category.id,
          confidence,
          reason: explainCategoryScore(category, score)
        };
      }) as CategoryRecommendation[];

    const duplicateCategoryCandidates = detectDuplicateCategories(
      liveCategories.map((category) => category.name),
      siteConfig.categories.fallbackCategories
    );

    const suggestedNewCategory =
      topCategory && topCategory.score > 0
        ? undefined
        : buildSuggestedCategory(text, liveCategories, siteConfig.categories.fallbackCategories);

    const recommendedTags = buildRecommendedTags({
      liveTags,
      preferredTags: siteConfig.tags.preferred,
      inputText: text,
      minTags: siteConfig.tags.minTags,
      maxTags: siteConfig.tags.maxTags
    });

    return {
      recommendedCategories:
        recommendedCategories.length > 0
          ? recommendedCategories
          : siteConfig.categories.fallbackCategories.map((name) => {
              const confidence: CategoryRecommendation['confidence'] = 'none';

              return {
                name,
                slug: slugify(name),
                confidence,
                reason: 'Fallback category from site config because no live category was available.'
              };
            }) as CategoryRecommendation[],
      suggestedNewCategory,
      recommendedTags: recommendedTags.map((tag) => tag.name),
      tagRecommendations: recommendedTags,
      duplicateCategoryCandidates
    };
  }
}

function scoreCategory(
  category: SiteTerm,
  tokens: string[],
  input: RecommendationInput
) {
  const categoryName = normalize(category.name);
  const categorySlug = normalize(category.slug ?? '');
  const title = normalize(input.title ?? '');
  const text = normalize(input.inputText);
  const combined = `${title} ${text}`.trim();
  let score = 0;

  if (isGenericCategory(categoryName)) {
    score -= categoryName.includes('uncategorized') ? 5 : 1;
  }

  if (categoryName && (containsWholePhrase(combined, categoryName) || containsWholePhrase(categoryName, title))) {
    score += 5;
  }

  if (categorySlug && (containsWholePhrase(combined, categorySlug) || containsWholePhrase(categorySlug, title))) {
    score += 5;
  }

  if (tokens.some((token) => categoryName.includes(token) || categorySlug.includes(token))) {
    score += 2;
  }

  if (category.description) {
    const description = normalize(category.description);
    if (tokens.some((token) => description.includes(token))) {
      score += 3;
    }
  }

  if (input.tags?.some((tag) => normalize(tag) === categoryName || normalize(tag) === categorySlug)) {
    score += 3;
  }

  return score;
}

function explainCategoryScore(category: SiteTerm, score: number) {
  if (score >= 7) {
    return `Strong match for ${category.name}.`;
  }

  if (score >= 4) {
    return `Moderate match for ${category.name}.`;
  }

  if (score > 0) {
    return `Loose topical match for ${category.name}.`;
  }

  return `No meaningful match for ${category.name}.`;
}

function buildRecommendedTags(input: {
  liveTags: SiteTerm[];
  preferredTags: string[];
  inputText: string;
  minTags: number;
  maxTags: number;
}) {
  const tokens = tokenize(input.inputText);
  const sourceTags: SiteTerm[] =
    input.liveTags.length > 0 ? input.liveTags : input.preferredTags.map((name) => ({ name }));
  const scored = sourceTags.map((tag, index) => {
    const normalized = normalize(tag.name);
    const matched = tokens.filter((token) => normalized.includes(token));
    return {
      tag: tag.name,
      score:
        matched.length * 2 +
        (input.preferredTags.some((candidate) => normalize(candidate) === normalized) ? 1 : 0),
      id: tag.id,
      matchedCount: matched.length,
      index
    };
  });

  scored.sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = dedupeByNormalized(
    scored
      .filter((entry) => entry.score > 0)
      .map((entry) => {
        const confidence: TagRecommendation['confidence'] =
          entry.score >= 4 ? 'high' : entry.score >= 2 ? 'medium' : 'low';

        return {
          name: entry.tag,
          confidence,
          existingTagId: entry.id,
          reason: `Matched ${entry.matchedCount} keyword${entry.matchedCount === 1 ? '' : 's'} from the package input.`
        };
      }) as TagRecommendation[]
  );

  const fallback = dedupeByNormalized(
    scored.map((entry) => {
      const confidence: TagRecommendation['confidence'] = 'low';

      return {
        name: entry.tag,
        confidence,
        existingTagId: entry.id,
        reason: 'Selected from existing or preferred tags.'
      };
    }) as TagRecommendation[]
  );

  const chosen = selected.length >= input.minTags ? selected : fallback;
  return chosen.slice(0, input.maxTags);
}

function buildSuggestedCategory(
  text: string,
  liveCategories: SiteTerm[],
  fallbackCategories: string[]
) {
  const words = tokenize(text).filter((word) => !STOP_WORDS.has(word));
  const candidate = titleCase(words.slice(0, 3).join(' ')) || fallbackCategories[0];
  if (!candidate) {
    return undefined;
  }

  if (isDuplicateName(candidate, liveCategories.map((category) => category.name))) {
    return undefined;
  }

  if (isDuplicateName(candidate, fallbackCategories)) {
    return undefined;
  }

  return {
    name: candidate,
    slug: slugify(candidate),
    reason: 'No existing category was a strong enough match, so a new category is suggested for confirmation.'
  };
}

function detectDuplicateCategories(existingNames: string[], candidates: string[]) {
  return candidates.filter((candidate) => isDuplicateName(candidate, existingNames));
}

function isDuplicateName(candidate: string, existingNames: string[]) {
  const normalizedCandidate = normalize(candidate);
  return existingNames.some((existing) => {
    const normalizedExisting = normalize(existing);
    return (
      normalizedExisting === normalizedCandidate ||
      normalizedExisting === singularize(normalizedCandidate) ||
      singularize(normalizedExisting) === normalizedCandidate ||
      normalizedExisting === singularize(normalizedCandidate).replace(/-/g, '') ||
      normalize(existing.replace(/[^a-z0-9]+/g, ' ')) === normalize(candidate.replace(/[^a-z0-9]+/g, ' '))
    );
  });
}

function containsWholePhrase(source: string, term: string) {
  if (!source || !term) return false;
  return source.includes(term);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(value: string) {
  return value.replace(/(?:es|s)\b/g, '');
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function tokenize(value: string) {
  return normalize(value)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function dedupeByNormalized<T extends { name: string }>(values: Array<T>) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalize(value.name);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function isGenericCategory(value: string) {
  return ['general', 'misc', 'miscellaneous', 'uncategorized', 'blog', 'blogs', 'updates'].includes(value);
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'from',
  'this',
  'into',
  'your',
  'about',
  'how',
  'what',
  'when',
  'where',
  'why',
  'are',
  'was',
  'were',
  'has',
  'have',
  'had',
  'will',
  'can',
  'could',
  'should',
  'would',
  'not',
  'use',
  'used',
  'more',
  'less',
  'than',
  'over',
  'under',
  'new',
  'best'
]);

export type { RecommendationResult, CategoryRecommendation, TagRecommendation };
