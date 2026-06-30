'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildImageFileName, validateAltText } from '@/lib/image-utils';
import { slugify } from '@/lib/text-utils';

type PackageRecord = {
  id: string;
  title: string;
  linkedinPost: string;
  excerpt: string;
  plainCsvTags: string;
  featureImagePrompt?: string | null;
  featureImageUrl?: string | null;
  altText: string;
  suggestedImageFileName: string;
  seoPackage: {
    seoTitle: string;
    slug: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntentSummary: string;
    readinessScore: number;
    warnings: string[];
    internalLinkSuggestions: string[];
  };
  recommendedCategories: Array<{ name: string; slug?: string; confidence: string; reason: string }>;
  recommendedTags: string[];
  tagRecommendations?: Array<{ name: string; confidence: string; reason: string }>;
  generatedImages?: Array<{ localImageUrl?: string | null; imageFilename: string; altText: string }>;
  publishingAttempts?: Array<{ wordpressPostId?: number | null; wordpressPostUrl?: string | null; wordpressStatus: string; socialStatus: string }>;
};

type Props = {
  packageId: string;
  initialPackage: PackageRecord;
};

export function PackageEditorClient({ packageId, initialPackage }: Props) {
  const [record, setRecord] = useState(initialPackage);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState('');
  const [selectedTagNames, setSelectedTagNames] = useState(record.recommendedTags.join(', '));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [publishAction, setPublishAction] = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [confirmNewCategory, setConfirmNewCategory] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmImageApproval, setConfirmImageApproval] = useState(Boolean(record.altText));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('Ready for final confirmation.');
  const [isBusy, setIsBusy] = useState(false);

  const imageValidation = useMemo(() => validateAltText(record.altText), [record.altText]);

  async function saveChanges() {
    setIsBusy(true);
    setMessage('Saving package changes...');
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: record.title,
          linkedinPost: record.linkedinPost,
          excerpt: record.excerpt,
          plainCsvTags: record.plainCsvTags,
          altText: record.altText,
          suggestedImageFileName: record.suggestedImageFileName,
          seoPackage: record.seoPackage
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Save failed.');
      }
      setRecord((current) => ({ ...current, ...payload.data }));
      setMessage('Package saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsBusy(false);
    }
  }

  async function prepareImage() {
    setIsBusy(true);
    setMessage('Preparing featured image...');
    try {
      const response = await fetch(`/api/packages/${packageId}/image`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Image preparation failed.');
      }
      setRecord((current) => ({
        ...current,
        featureImagePrompt: payload.data?.generatedImage?.imagePrompt ?? current.featureImagePrompt,
        featureImageUrl: payload.data?.imageUrl ?? current.featureImageUrl,
        altText: payload.data?.altText ?? current.altText,
        suggestedImageFileName: payload.data?.suggestedImageFileName ?? current.suggestedImageFileName
      }));
      setConfirmImageApproval(true);
      setMessage('Featured image prepared.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image preparation failed.');
    } finally {
      setIsBusy(false);
    }
  }

  async function publish() {
    if (!confirmPublish) {
      setMessage('Confirm publication before continuing.');
      return;
    }

    if (record.featureImageUrl && !imageValidation.valid) {
      setMessage(imageValidation.reason);
      return;
    }

    setIsBusy(true);
    setMessage('Submitting publishing request...');
    try {
      const response = await fetch(`/api/packages/${packageId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: publishAction,
          confirmNewCategory,
          confirmPublish,
          confirmImageApproval,
          idempotencyKey,
          selectedCategoryIds: parseIdList(selectedCategoryIds),
          selectedTagNames: parseTagList(selectedTagNames),
          newCategoryName: newCategoryName.trim() || undefined,
          newCategorySlug: newCategorySlug.trim() || undefined,
          featuredMediaUrl: record.featureImageUrl ?? undefined,
          featuredMediaAltText: record.altText || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Publishing failed.');
      }
      setMessage(`Publishing complete. WordPress post ${payload.data?.wordpressPostId ?? ''}.`);
      setRecord((current) => ({ ...current, publishingAttempts: [payload.data, ...(current.publishingAttempts ?? [])] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publishing failed.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <EditableField label="Title" value={record.title} onChange={(value) => setRecord((current) => ({ ...current, title: value }))} />
        <EditableField label="LinkedIn Post" textarea value={record.linkedinPost} onChange={(value) => setRecord((current) => ({ ...current, linkedinPost: value }))} />
        <EditableField label="Excerpt" textarea value={record.excerpt} onChange={(value) => setRecord((current) => ({ ...current, excerpt: value }))} />
        <EditableField label="Plain CSV Tags" value={record.plainCsvTags} onChange={(value) => setRecord((current) => ({ ...current, plainCsvTags: value }))} />
        <EditableField label="SEO Title" value={record.seoPackage.seoTitle} onChange={(value) => setRecord((current) => ({ ...current, seoPackage: { ...current.seoPackage, seoTitle: value } }))} />
        <EditableField label="Slug" value={record.seoPackage.slug} onChange={(value) => setRecord((current) => ({ ...current, seoPackage: { ...current.seoPackage, slug: slugify(value) } }))} />
        <EditableField label="Meta Description" textarea value={record.seoPackage.metaDescription} onChange={(value) => setRecord((current) => ({ ...current, seoPackage: { ...current.seoPackage, metaDescription: value } }))} />
        <EditableField label="Alt Text" value={record.altText} onChange={(value) => setRecord((current) => ({ ...current, altText: value }))} />
        <EditableField label="Suggested Image Filename" value={record.suggestedImageFileName} onChange={(value) => setRecord((current) => ({ ...current, suggestedImageFileName: buildImageFileName(value) }))} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Selected category IDs" value={selectedCategoryIds} onChange={setSelectedCategoryIds} placeholder="1,2,3" />
          <Field label="Selected tag names" value={selectedTagNames} onChange={setSelectedTagNames} placeholder="tag one, tag two" />
          <Field label="New category name" value={newCategoryName} onChange={setNewCategoryName} />
          <Field label="New category slug" value={newCategorySlug} onChange={setNewCategorySlug} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={saveChanges} disabled={isBusy}>Save changes</Button>
          <Button onClick={prepareImage} variant="secondary" disabled={isBusy}>Prepare image</Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Action</label>
          <select className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm" value={publishAction} onChange={(event) => setPublishAction(event.target.value as 'draft' | 'publish' | 'schedule')}>
            <option value="draft">Create draft</option>
            <option value="publish">Publish</option>
            <option value="schedule">Schedule</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmPublish} onChange={(event) => setConfirmPublish(event.target.checked)} />
            Final confirmation
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmNewCategory} onChange={(event) => setConfirmNewCategory(event.target.checked)} />
            Confirm new category
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmImageApproval} onChange={(event) => setConfirmImageApproval(event.target.checked)} />
            Approve image
          </label>
        </div>

        <Button onClick={publish} disabled={isBusy || !confirmPublish}>Create WordPress entry</Button>
        <p className="text-sm text-slate-600">{message}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between">
          <Badge>Confirmation</Badge>
          <span className="text-xs uppercase tracking-wide text-slate-500">ID {packageId}</span>
        </div>

        <Preview label="SEO readiness" value={`${record.seoPackage.readinessScore}/100`} />
        <Preview label="SEO warnings" value={record.seoPackage.warnings.join(' | ') || 'None'} />
        <Preview label="Recommended categories" value={record.recommendedCategories.map((category) => `${category.name} (${category.confidence})`).join(', ')} />
        <Preview label="Suggested new category" value={newCategoryName || 'None'} />
        <Preview label="Image preview" value={record.featureImageUrl ?? 'No image generated yet'} />
        <Preview label="Alt text validation" value={imageValidation.valid ? 'Valid' : imageValidation.reason} />
        <Preview label="Suggested image filename" value={record.suggestedImageFileName || 'None'} />
        <Preview label="Latest publish attempt" value={record.publishingAttempts?.[0] ? `${record.publishingAttempts[0].wordpressStatus} · ${record.publishingAttempts[0].wordpressPostUrl ?? ''}` : 'None'} />
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      {textarea ? (
        <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
    </div>
  );
}

function parseIdList(value: string) {
  return value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
}

function parseTagList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
