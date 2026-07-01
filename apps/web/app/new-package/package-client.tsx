'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiSafeguardsEditor } from '@/components/ai-safeguards-editor';
import { CopyButton } from '@/components/copy-button';
import { Textarea } from '@/components/ui/textarea';
import { defaultAiSafeguard, normalizeAiSafeguards, resolveSelectedSafeguard, type AiSafeguard } from '@/lib/ai-safeguards';
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
  initialAiSafeguards: AiSafeguard[];
  initialSelectedAiSafeguardId: string;
};

export function NewPackageClient({
  defaultSiteKey,
  defaultContentProfileKey,
  initialAiSafeguards,
  initialSelectedAiSafeguardId
}: Props) {
  const [inputText, setInputText] = useState('');
  const [sourceSafetyType, setSourceSafetyType] = useState<(typeof sourceSafetyOptions)[number]['value']>('notes_only');
  const [generated, setGenerated] = useState<GeneratedPackageResponse | null>(null);
  const [message, setMessage] = useState('Ready to generate a package.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationAttempted, setGenerationAttempted] = useState(false);
  const [isSafeguardsOpen, setIsSafeguardsOpen] = useState(false);
  const [aiSafeguards, setAiSafeguards] = useState(() => normalizeAiSafeguards(initialAiSafeguards));
  const [selectedAiSafeguardId, setSelectedAiSafeguardId] = useState(
    initialSelectedAiSafeguardId || defaultAiSafeguard.id
  );
  const trimmedInputLength = inputText.trim().length;
  const inputTooShort = trimmedInputLength < 20;
  const showInputWarning = inputTooShort && (generationAttempted || trimmedInputLength > 0);
  const selectedAiSafeguard = resolveSelectedSafeguard(aiSafeguards, selectedAiSafeguardId);

  async function saveSafeguards(nextSafeguards = aiSafeguards, nextSelectedId = selectedAiSafeguardId) {
    setAiSafeguards(normalizeAiSafeguards(nextSafeguards));
    setSelectedAiSafeguardId(nextSelectedId);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSafeguards: normalizeAiSafeguards(nextSafeguards),
          selectedAiSafeguardId: nextSelectedId
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Unable to save AI safeguards.');
      }
      setMessage('AI safeguards saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save AI safeguards.');
    }
  }

  async function handleGenerate() {
    setGenerationAttempted(true);

    if (inputTooShort) {
      setMessage(`Add at least ${20 - trimmedInputLength} more character${20 - trimmedInputLength === 1 ? '' : 's'} before generating.`);
      return;
    }

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
          contentProfileKey: defaultContentProfileKey,
          aiSafeguard: selectedAiSafeguard
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
          <label className="text-sm font-semibold text-slate-800" htmlFor="source-safety">
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
          <label className="text-sm font-semibold text-slate-800" htmlFor="input-text">
            Rough text or notes
          </label>
          <Textarea
            id="input-text"
            value={inputText}
            onChange={(event) => {
              setInputText(event.target.value);
              if (event.target.value.trim().length >= 20) {
                setMessage('Ready to generate a package.');
              }
            }}
            placeholder="Paste rough notes, source text, or an outline here."
            aria-invalid={showInputWarning}
            className={showInputWarning ? 'border-red-500 bg-red-50/40 focus:border-red-600 focus:ring-red-200' : undefined}
          />
          <p className={showInputWarning ? 'text-xs font-semibold text-red-700' : 'text-xs text-slate-500'}>
            Minimum 20 characters. Current: {trimmedInputLength}.
            {showInputWarning ? ` Add ${20 - trimmedInputLength} more.` : ''}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900">AI safeguard</p>
              <p className="mt-1 text-slate-600">{selectedAiSafeguard.name}</p>
            </div>
            <Button variant="secondary" onClick={() => setIsSafeguardsOpen(true)}>
              Edit safeguards
            </Button>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isSubmitting}>
          {isSubmitting ? 'Generating...' : 'Generate package'}
        </Button>

        <p className="text-sm text-slate-600">{message}</p>
      </div>

      {isSafeguardsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="AI safeguards"
          onClick={() => setIsSafeguardsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">AI safeguards</h2>
                <p className="mt-1 text-sm text-slate-600">
                  These are the same safeguards available in Settings and are used during generation.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setIsSafeguardsOpen(false)}>
                Close
              </Button>
            </div>

            <div className="mt-5">
              <AiSafeguardsEditor
                safeguards={aiSafeguards}
                selectedId={selectedAiSafeguard.id}
                onChange={(next) => {
                  setAiSafeguards(next.safeguards);
                  setSelectedAiSafeguardId(next.selectedId);
                }}
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsSafeguardsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void saveSafeguards(aiSafeguards, selectedAiSafeguardId);
                  setIsSafeguardsOpen(false);
                }}
              >
                Save safeguards
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge>Package preview</Badge>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Validated output</span>
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
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</p>
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
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</p>
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
