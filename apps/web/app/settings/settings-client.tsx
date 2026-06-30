'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SettingsPayload = {
  appUrl: string;
  aiProvider: string;
  openAiKeyConfigured: boolean;
  openAiTextModel: string;
  openAiImageModel: string;
  defaultSiteKey: string;
  wordpressSiteUrl: string;
  wordpressUsername: string;
  wordpressPasswordConfigured: boolean;
  pluginTokenConfigured: boolean;
  completion: {
    configured: boolean;
    missing: string[];
  };
};

type Props = {
  initialSettings: SettingsPayload;
};

export function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState({
    aiProvider: initialSettings.aiProvider,
    openAiApiKey: '',
    openAiTextModel: initialSettings.openAiTextModel,
    openAiImageModel: initialSettings.openAiImageModel,
    wordpressSiteUrl: initialSettings.wordpressSiteUrl,
    wordpressUsername: initialSettings.wordpressUsername,
    wordpressApplicationPassword: '',
    wordpressPluginToken: ''
  });
  const [message, setMessage] = useState('Settings loaded.');
  const [isSaving, setIsSaving] = useState(false);

  async function saveSettings() {
    setIsSaving(true);
    setMessage('Saving settings...');

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Settings save failed.');
      }
      setSettings(payload.data);
      setForm((current) => ({
        ...current,
        openAiApiKey: '',
        wordpressApplicationPassword: '',
        wordpressPluginToken: ''
      }));
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge>{settings.completion.configured ? 'Configured' : 'Incomplete'}</Badge>
            <span className="text-xs uppercase tracking-wide text-slate-500">{settings.defaultSiteKey}</span>
          </div>
          <CardTitle>Setup status</CardTitle>
          <CardDescription>Secrets are stored server-side and never returned to this page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <StatusRow label="OpenAI API key" configured={settings.openAiKeyConfigured} />
          <StatusRow label="WordPress password" configured={settings.wordpressPasswordConfigured} />
          <StatusRow label="Plugin token" configured={settings.pluginTokenConfigured} />
          {settings.completion.missing.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
              Missing: {settings.completion.missing.join(', ')}
            </div>
          ) : null}
          <p className="text-slate-600">{message}</p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
            <CardDescription>Model names are editable; the API key field is write-only.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" value={form.aiProvider} onChange={(value) => setForm((current) => ({ ...current, aiProvider: value }))} />
            <Field label="OpenAI API key" type="password" value={form.openAiApiKey} onChange={(value) => setForm((current) => ({ ...current, openAiApiKey: value }))} placeholder={settings.openAiKeyConfigured ? 'Configured' : ''} />
            <Field label="Text model" value={form.openAiTextModel} onChange={(value) => setForm((current) => ({ ...current, openAiTextModel: value }))} />
            <Field label="Image model" value={form.openAiImageModel} onChange={(value) => setForm((current) => ({ ...current, openAiImageModel: value }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WordPress Site</CardTitle>
            <CardDescription>Credentials are stored locally for the selected site.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Site URL" value={form.wordpressSiteUrl} onChange={(value) => setForm((current) => ({ ...current, wordpressSiteUrl: value }))} />
            <Field label="Username" value={form.wordpressUsername} onChange={(value) => setForm((current) => ({ ...current, wordpressUsername: value }))} />
            <Field label="Application password" type="password" value={form.wordpressApplicationPassword} onChange={(value) => setForm((current) => ({ ...current, wordpressApplicationPassword: value }))} placeholder={settings.wordpressPasswordConfigured ? 'Configured' : ''} />
            <Field label="Plugin token" type="password" value={form.wordpressPluginToken} onChange={(value) => setForm((current) => ({ ...current, wordpressPluginToken: value }))} placeholder={settings.pluginTokenConfigured ? 'Configured' : ''} />
          </CardContent>
        </Card>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

function StatusRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <span className={configured ? 'text-emerald-700' : 'text-amber-700'}>
        {configured ? 'Configured' : 'Missing'}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
