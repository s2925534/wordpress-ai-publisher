import type { ContentProfileConfig, SiteConfig } from '@/lib/config-schemas';
import type { SourceSafetyType } from '@/lib/ai-schemas';
import type { AiSafeguard } from '@/lib/ai-safeguards';
import { formatTagName } from '@/lib/text-utils';

type BuildPromptInput = {
  inputText: string;
  sourceSafetyType: SourceSafetyType;
  siteConfig: SiteConfig;
  contentProfile: ContentProfileConfig;
  aiSafeguard?: AiSafeguard;
};

export function buildDefaultContentProfilePrompt(input: BuildPromptInput) {
  const { contentProfile, siteConfig, inputText, sourceSafetyType } = input;
  const preferredTags = siteConfig.tags.preferred.map((tag) => formatTagName(tag));
  const safetyGuidance =
    sourceSafetyType === 'third_party_text' || sourceSafetyType === 'unknown'
      ? 'Do not copy or closely paraphrase another author\'s distinctive wording. Use source material for general reference only.'
      : 'Use the source material directly as notes for original content generation.';

  return [
    `You are preparing a ${contentProfile.name} for ${siteConfig.brand.displayName}.`,
    `Site: ${siteConfig.siteName} (${siteConfig.siteUrl})`,
    `Audience: ${siteConfig.brand.audiences.join(', ')}`,
    `Tone to prefer: ${siteConfig.brand.preferredTone.join(', ')}`,
    `Tone to avoid: ${siteConfig.brand.avoidTone.join(', ')}`,
    `Preferred hashtags: ${siteConfig.hashtags.preferred.join(', ') || 'none'}`,
    `Preferred tags: ${preferredTags.join(', ') || 'none'}`,
    `Category policy: ${siteConfig.categories.mode}`,
    `SEO target title length: ${siteConfig.seo.titleTargetLength.min}-${siteConfig.seo.titleTargetLength.max} characters`,
    `SEO target meta description length: ${siteConfig.seo.metaDescriptionTargetLength.min}-${siteConfig.seo.metaDescriptionTargetLength.max} characters`,
    `Image style: ${siteConfig.image.style.join(', ')}`,
    `Image avoid: ${siteConfig.image.avoid.join(', ')}`,
    `Source safety: ${sourceSafetyType}`,
    safetyGuidance,
    input.aiSafeguard
      ? `AI safeguards profile: ${input.aiSafeguard.name}\n${input.aiSafeguard.guidelines}`
      : '',
    `Source text: ${inputText}`,
    `Output order: ${contentProfile.outputOrder.join(' > ')}`,
    'Return original, publication-ready content that is practical, credible, and suitable for WordPress and LinkedIn.'
  ].filter(Boolean).join('\n');
}
