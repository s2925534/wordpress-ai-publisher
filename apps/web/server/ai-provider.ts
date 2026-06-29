import {
  aiRegenerationSectionSchema,
  publicationPackageSchema,
  seoPackageSchema,
  type AiRegenerationSection,
  type PublicationPackage,
  type SeoPackage,
  type SourceSafetyType
} from '@/lib/ai-schemas';
import type { ContentProfileConfig, SiteConfig } from '@/lib/config-schemas';
import {
  firstSentence,
  slugify,
  summarizeText,
  titleCase
} from '@/lib/text-utils';
import { buildDefaultContentProfilePrompt } from '@/server/ai-prompt-builder';

export type PackageGenerationInput = {
  inputText: string;
  sourceSafetyType: SourceSafetyType;
  siteConfig: SiteConfig;
  contentProfile: ContentProfileConfig;
};

export type SeoGenerationInput = PackageGenerationInput & {
  title?: string;
};

export type ImagePromptInput = PackageGenerationInput & {
  title: string;
};

export type AltTextInput = PackageGenerationInput & {
  title: string;
  imagePrompt: string;
};

export type RegenerationInput = PackageGenerationInput & {
  section: AiRegenerationSection;
  currentValue?: string;
};

export interface AIProvider {
  generatePublicationPackage(input: PackageGenerationInput): Promise<PublicationPackage>;
  generateSeoPackage(input: SeoGenerationInput): Promise<SeoPackage>;
  generateImagePrompt(input: ImagePromptInput): Promise<string>;
  generateImage(input: ImagePromptInput): Promise<{ imageUrl: string | null }>;
  generateAltText(input: AltTextInput): Promise<string>;
  regenerateSection(input: RegenerationInput): Promise<string>;
}

export class MockAIProvider implements AIProvider {
  async generatePublicationPackage(input: PackageGenerationInput): Promise<PublicationPackage> {
    const title = this.buildTitle(input.inputText);
    const seoPackage = await this.generateSeoPackage({ ...input, title });
    const featureImagePrompt = await this.generateImagePrompt({ ...input, title });
    const altText = await this.generateAltText({ ...input, title, imagePrompt: featureImagePrompt });
    const suggestedImageFileName = slugify(title);
    const recommendedTags = this.buildRecommendedTags(input);

    return publicationPackageSchema.parse({
      title,
      linkedinPost: this.buildLinkedInPost(input),
      excerpt: this.buildExcerpt(input),
      plainCsvTags: recommendedTags.join(', '),
      recommendedCategories: this.buildRecommendedCategories(input),
      recommendedTags,
      featureImagePrompt,
      altText,
      suggestedImageFileName,
      seoPackage,
      sourceSafetyType: input.sourceSafetyType
    });
  }

  async generateSeoPackage(input: SeoGenerationInput): Promise<SeoPackage> {
    const title = input.title ?? this.buildTitle(input.inputText);
    const slug = slugify(title);
    const metaDescription = `${summarizeText(input.inputText, 22)}. ${input.siteConfig.brand.positioning}`;

    return seoPackageSchema.parse({
      seoTitle: title,
      slug,
      metaDescription: metaDescription.slice(0, input.siteConfig.seo.metaDescriptionTargetLength.max),
      primaryKeyword: summarizeText(input.siteConfig.tags.preferred[0] ?? title, 4),
      secondaryKeywords: input.siteConfig.tags.preferred.slice(1, 4),
      searchIntentSummary: `Readers want practical guidance about ${summarizeText(title, 6).toLowerCase()}.`,
      readinessScore: 78,
      warnings: input.inputText.trim().length < 120 ? ['Input text is short and may produce a thinner SEO package.'] : [],
      internalLinkSuggestions: []
    });
  }

  async generateImagePrompt(input: ImagePromptInput): Promise<string> {
    return `Create a ${input.siteConfig.image.style.join(', ')} featured image for "${input.title}". Emphasize ${input.siteConfig.brand.positioning.toLowerCase()}. Avoid ${input.siteConfig.image.avoid.join(', ')}.`;
  }

  async generateImage(input: ImagePromptInput): Promise<{ imageUrl: string | null }> {
    return {
      imageUrl: `mock://image/${slugify(input.title)}.png`
    };
  }

  async generateAltText(input: AltTextInput): Promise<string> {
    return `Featured image illustrating ${input.title} for a WordPress publication.`;
  }

  async regenerateSection(input: RegenerationInput): Promise<string> {
    aiRegenerationSectionSchema.parse(input.section);

    switch (input.section) {
      case 'title':
        return this.buildTitle(input.inputText);
      case 'linkedinPost':
        return this.buildLinkedInPost(input);
      case 'excerpt':
        return this.buildExcerpt(input);
      case 'metaDescription':
        return (await this.generateSeoPackage(input)).metaDescription;
      case 'slug':
        return (await this.generateSeoPackage(input)).slug;
      case 'tags':
        return this.buildRecommendedTags(input).join(', ');
      case 'categoryRecommendation':
        return this.buildRecommendedCategories(input).map((category) => category.name).join(', ');
      case 'featureImagePrompt':
        return this.buildFeatureImagePrompt(input);
      case 'featureImage':
        return `mock://image/${slugify(this.buildTitle(input.inputText))}.png`;
      case 'altText':
        return this.buildAltText(input);
      case 'introduction':
        return firstSentence(input.inputText) || this.buildExcerpt(input);
      case 'conclusion':
        return 'The main takeaway is to keep the workflow original, structured, and ready for review.';
      default:
        return '';
    }
  }

  private buildTitle(inputText: string) {
    const summary = summarizeText(firstSentence(inputText) || inputText, 10);
    return titleCase(summary.replace(/[.!?]+$/g, ''));
  }

  private buildLinkedInPost(input: PackageGenerationInput) {
    const title = this.buildTitle(input.inputText);
    const hashtags = input.siteConfig.hashtags.preferred.slice(0, 3).join(' ');
    return [
      `${title} is a practical example of turning rough notes into a publication-ready package.`,
      `The important part is keeping the content original, clear, and structured for review.`,
      `How are you handling content generation in your own workflow?`,
      hashtags
    ].join('\n\n');
  }

  private buildExcerpt(input: PackageGenerationInput) {
    const summary = summarizeText(input.inputText, 28);
    return `${summary}. Written for ${input.siteConfig.brand.displayName}.`;
  }

  private buildRecommendedTags(input: PackageGenerationInput) {
    const preferred = input.siteConfig.tags.preferred.slice(0, input.siteConfig.tags.maxTags);
    return preferred.length >= input.siteConfig.tags.minTags ? preferred : input.siteConfig.tags.preferred;
  }

  private buildRecommendedCategories(input: PackageGenerationInput) {
    const base = input.siteConfig.categories.fallbackCategories[0] ?? 'General';
    return [
      {
        name: base,
        slug: slugify(base),
        confidence: 'none' as const,
        reason: 'Default recommendation derived from the site configuration.'
      }
    ];
  }

  private buildFeatureImagePrompt(input: PackageGenerationInput) {
    return `Create a ${input.siteConfig.image.style.join(', ')} image for ${this.buildTitle(input.inputText)}.`;
  }

  private buildAltText(input: PackageGenerationInput) {
    return `Featured image for ${this.buildTitle(input.inputText)}.`;
  }
}

type OpenAIProviderOptions = {
  apiKey: string;
  textModel: string;
  imageModel: string;
  fetchFn?: typeof fetch;
};

export class OpenAIProvider implements AIProvider {
  constructor(private readonly options: OpenAIProviderOptions) {}

  async generatePublicationPackage(input: PackageGenerationInput): Promise<PublicationPackage> {
    const raw = await this.requestText(
      'Generate a publication package as strict JSON.',
      buildDefaultContentProfilePrompt(input),
      this.options.textModel
    );
    return publicationPackageSchema.parse(JSON.parse(raw));
  }

  async generateSeoPackage(input: SeoGenerationInput): Promise<SeoPackage> {
    const raw = await this.requestText(
      'Generate an SEO package as strict JSON.',
      buildDefaultContentProfilePrompt(input),
      this.options.textModel
    );
    return seoPackageSchema.parse(JSON.parse(raw));
  }

  async generateImagePrompt(input: ImagePromptInput): Promise<string> {
    return this.requestText(
      'Generate a concise image prompt.',
      buildDefaultContentProfilePrompt(input),
      this.options.textModel
    );
  }

  async generateImage(input: ImagePromptInput): Promise<{ imageUrl: string | null }> {
    const response = await this.fetchFn('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        model: this.options.imageModel,
        prompt: await this.generateImagePrompt(input),
        size: '1024x1024'
      })
    });

    if (!response.ok) {
      throw new Error(`Image generation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: Array<{ url?: string }> };
    return { imageUrl: payload.data?.[0]?.url ?? null };
  }

  async generateAltText(input: AltTextInput): Promise<string> {
    return this.requestText(
      'Generate concise alt text.',
      buildDefaultContentProfilePrompt(input),
      this.options.textModel
    );
  }

  async regenerateSection(input: RegenerationInput): Promise<string> {
    return this.requestText(
      `Regenerate section ${input.section} as plain text.`,
      buildDefaultContentProfilePrompt(input),
      this.options.textModel
    );
  }

  private get fetchFn() {
    return this.options.fetchFn ?? fetch;
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  private async requestText(systemPrompt: string, userPrompt: string, model: string) {
    const response = await this.fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const content = payload.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error('OpenAI response did not include any content.');
    }

    return content;
  }
}
