'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';
import { Textarea } from '@/components/ui/textarea';
import {
  generatedPackageResponseSchema,
  type GeneratedPackageResponse
} from '@/lib/generation-schemas';
import { formatTagName } from '@/lib/text-utils';

const sourceSafetyOptions = [
  { value: 'my_own_text', label: 'My own text' },
  { value: 'public_reference', label: 'Public reference' },
  { value: 'third_party_text', label: 'Third-party text' },
  { value: 'notes_only', label: 'Notes only' },
  { value: 'unknown', label: 'Unknown' }
] as const;

type Props = {
  defaultSiteKey: string;
  defaultContentProfileKey: string;
};

export function NewPackageClient({ defaultSiteKey, defaultContentProfileKey }: Props) {
  const [inputText, setInputText] = useState('');
  const [sourceSafetyType, setSourceSafetyType] = useState<(typeof sourceSafetyOptions)[number]['value']>('notes_only');
  const [generated, setGenerated] = useState<GeneratedPackageResponse | null>(null);
  const [message, setMessage] = useState('Ready to generate a package.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerate() {
    setIsSubmitting(true);
    setMessage('Generating package...');

    try {
      const response = await fetch('/api/packages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          sourceSafetyType,
          siteKey: defaultSiteKey,
          contentProfileKey: defaultContentProfileKey
        })
      });
      const payload = (await response.json()) as { success: boolean; data?: unknown; error?: { message?: string } };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? 'Package generation failed.');
      }

      const parsed = generatedPackageResponseSchema.parse(payload.data);
      setGenerated(normalizeGeneratedPackage(parsed));
      setMessage('Package generated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Package generation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="source-safety">
            Source safety
          </label>
          <select
            id="source-safety"
            value={sourceSafetyType}
            onChange={(event) => setSourceSafetyType(event.target.value as (typeof sourceSafetyOptions)[number]['value'])}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {sourceSafetyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="input-text">
            Rough text or notes
          </label>
          <Textarea
            id="input-text"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Paste rough notes, source text, or an outline here."
          />
        </div>

        <Button onClick={handleGenerate} disabled={isSubmitting || inputText.trim().length < 20}>
          {isSubmitting ? 'Generating...' : 'Generate package'}
        </Button>

        <p className="text-sm text-slate-600">{message}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge>Package preview</Badge>
          <span className="text-xs uppercase tracking-wide text-slate-500">Validated output</span>
        </div>

        {generated ? (
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <Detail label="Title" value={generated.title} />
            <Detail label="LinkedIn Post" value={generated.linkedinPost} />
            <Detail label="Excerpt" value={generated.excerpt} />
            <Detail label="Plain CSV Tags" value={generated.plainCsvTags} />
            <ChipDetail
              label="Recommended Categories"
              items={dedupeStrings(generated.recommendedCategories.map((category) => category.name))}
            />
            <Detail
              label="Category Reasoning"
              value={generated.recommendedCategories.map((category) => category.reason).join(' ')}
            />
            <ChipDetail
              label="Tag Recommendations"
              items={dedupeStrings((generated.tagRecommendations?.map((tag) => tag.name) ?? generated.recommendedTags).map(formatTagName))}
            />
            <Detail
              label="Duplicate Category Checks"
              value={generated.suggestedNewCategory ? 'No duplicates detected for the suggested category.' : 'No new category suggested.'}
            />
            <Detail
              label="Suggested New Category"
              value={
                generated.suggestedNewCategory
                  ? `${generated.suggestedNewCategory.name} - ${generated.suggestedNewCategory.reason}`
                  : 'None'
              }
            />
            <Detail label="Feature Image" value={generated.featureImagePrompt ?? 'No image prompt'} />
            <Detail label="Alt Text" value={generated.altText ?? 'No alt text'} />
            <Detail label="Suggested Image File Name" value={generated.suggestedImageFileName ?? 'None'} />
            <Detail label="SEO Title" value={generated.seoPackage.seoTitle} />
            <Detail label="SEO Slug" value={generated.seoPackage.slug} />
            <Detail label="Meta Description" value={generated.seoPackage.metaDescription} />
            <Detail label="Readiness Score" value={String(generated.seoPackage.readinessScore)} />
            {generated.packageId ? (
              <Link
                href={`/packages/${generated.packageId}`}
                className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Open final confirmation
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Generate a package to preview the validated output in the required order.
          </p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <CopyButton value={value} className="h-8 rounded-lg px-3 py-1 text-xs" />
      </div>
      <p className="mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ChipDetail({ label, items }: { label: string; items: string[] }) {
  const cleanItems = useMemo(() => dedupeStrings(items), [items]);
  const copyValue = cleanItems.join(', ');

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <CopyButton value={copyValue} className="h-8 rounded-lg px-3 py-1 text-xs" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {cleanItems.length ? (
          cleanItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-900"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-600">None</span>
        )}
      </div>
    </div>
  );
}

function normalizeGeneratedPackage(packageResult: GeneratedPackageResponse): GeneratedPackageResponse {
  const recommendedTags = dedupeStrings(packageResult.recommendedTags.map(formatTagName));

  return {
    ...packageResult,
    plainCsvTags: recommendedTags.join(', '),
    recommendedTags,
    tagRecommendations: packageResult.tagRecommendations?.map((tag) => ({
      ...tag,
      name: formatTagName(tag.name)
    }))
  };
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
