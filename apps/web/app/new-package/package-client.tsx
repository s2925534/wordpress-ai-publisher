'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  generatedPackageResponseSchema,
  type GeneratedPackageResponse
} from '@/lib/generation-schemas';

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
      setGenerated(parsed);
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
            <Detail
              label="Recommended Categories"
              value={generated.recommendedCategories.map((category) => category.name).join(', ')}
            />
            <Detail label="Feature Image" value={generated.featureImagePrompt ?? 'No image prompt'} />
            <Detail label="Alt Text" value={generated.altText ?? 'No alt text'} />
            <Detail label="Suggested Image File Name" value={generated.suggestedImageFileName ?? 'None'} />
            <Detail label="SEO Title" value={generated.seoPackage.seoTitle} />
            <Detail label="SEO Slug" value={generated.seoPackage.slug} />
            <Detail label="Meta Description" value={generated.seoPackage.metaDescription} />
            <Detail label="Readiness Score" value={String(generated.seoPackage.readinessScore)} />
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
