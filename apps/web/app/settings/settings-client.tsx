'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  wordpressSiteConfigured: boolean;
  wordpressSiteUrl: string;
  wordpressSiteProtocol: 'http' | 'https';
  wordpressSiteHostname: string;
  wordpressTimezone: string;
  wordpressUsername: string;
  wordpressPasswordConfigured: boolean;
  pluginTokenConfigured: boolean;
  completion: {
    configured: boolean;
    missing: string[];
  };
};

type SettingsForm = {
  aiProvider: string;
  openAiApiKey: string;
  openAiTextModel: string;
  openAiImageModel: string;
  wordpressSiteProtocol: 'http' | 'https';
  wordpressSiteHostname: string;
  wordpressTimezone: string;
  wordpressSiteUrl: string;
  wordpressUsername: string;
  wordpressApplicationPassword: string;
  wordpressPluginToken: string;
};

type Props = {
  initialSettings: SettingsPayload;
};

const STORAGE_KEY = 'wordpress-ai-publisher.browser-config.v1';

const TEXT_MODEL_OPTIONS = [
  { value: 'gpt-5.5', label: 'GPT-5.5 (default)' },
  { value: 'gpt-5.4', label: 'GPT-5.4 (lower cost)' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini (budget)' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano (lowest cost)' }
] as const;

const IMAGE_MODEL_OPTIONS = [
  { value: 'gpt-image-2', label: 'gpt-image-2 (default)' },
  { value: 'gpt-image-1.5', label: 'gpt-image-1.5 (fallback)' },
  { value: 'gpt-image-1', label: 'gpt-image-1 (legacy fallback)' },
  { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini (legacy fallback)' }
] as const;

export function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SettingsForm>({
    aiProvider: initialSettings.aiProvider,
    openAiApiKey: '',
    openAiTextModel: initialSettings.openAiTextModel || TEXT_MODEL_OPTIONS[0].value,
    openAiImageModel: initialSettings.openAiImageModel || IMAGE_MODEL_OPTIONS[0].value,
    wordpressSiteProtocol: initialSettings.wordpressSiteProtocol,
    wordpressSiteHostname: initialSettings.wordpressSiteHostname,
    wordpressTimezone: initialSettings.wordpressTimezone,
    wordpressSiteUrl: initialSettings.wordpressSiteUrl,
    wordpressUsername: initialSettings.wordpressUsername,
    wordpressApplicationPassword: '',
    wordpressPluginToken: ''
  });
  const [message, setMessage] = useState('Settings loaded.');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = loadBrowserConfig();
    if (saved) {
      setForm((current) => ({
        ...current,
        ...saved
      }));
      setMessage('Loaded browser draft configuration.');
    }
  }, []);

  useEffect(() => {
    const url = buildSiteUrl(form.wordpressSiteProtocol, form.wordpressSiteHostname);
    setForm((current) => (current.wordpressSiteUrl === url ? current : { ...current, wordpressSiteUrl: url }));
  }, [form.wordpressSiteHostname, form.wordpressSiteProtocol]);

  useEffect(() => {
    saveBrowserConfig(form);
  }, [form]);

  const timezoneOptions = useMemo(() => buildTimezoneOptions(), []);

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
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Settings save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  function downloadBrowserConfig() {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wordpress-ai-publisher-config.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importBrowserConfig(file?: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<SettingsForm>;
    setForm((current) => ({
      ...current,
      ...parsed
    }));
    setMessage('Imported browser configuration.');
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
          <CardDescription>
            Configuration is edited in the web form, cached in the browser, and saved to the local
            database when you click save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <StatusRow label="OpenAI API key" configured={settings.openAiKeyConfigured} />
          <StatusRow label="WordPress password" configured={settings.wordpressPasswordConfigured} />
          <StatusRow label="Plugin token" configured={settings.pluginTokenConfigured} />
          <StatusRow
            label="Site URL"
            configured={settings.wordpressSiteConfigured}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Site URL preview</p>
            <p className="mt-1 break-all text-sm text-slate-900">{form.wordpressSiteUrl || 'Not set'}</p>
          </div>
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
            <CardTitle>Browser config backup</CardTitle>
            <CardDescription>Download or restore the local configuration JSON.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={downloadBrowserConfig}>
              Download JSON
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                void importBrowserConfig(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
            <CardDescription>Choose the lower-cost default unless you need a stronger model.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Provider"
              value={form.aiProvider}
              onChange={(value) => setForm((current) => ({ ...current, aiProvider: value }))}
            />
            <Field
              label="OpenAI API key"
              type="password"
              value={form.openAiApiKey}
              onChange={(value) => setForm((current) => ({ ...current, openAiApiKey: value }))}
              placeholder={settings.openAiKeyConfigured ? 'Configured' : ''}
            />
            <SelectField
              label="Text model"
              value={form.openAiTextModel}
              onChange={(value) => setForm((current) => ({ ...current, openAiTextModel: value }))}
              options={TEXT_MODEL_OPTIONS}
            />
            <SelectField
              label="Image model"
              value={form.openAiImageModel}
              onChange={(value) => setForm((current) => ({ ...current, openAiImageModel: value }))}
              options={IMAGE_MODEL_OPTIONS}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WordPress Site</CardTitle>
            <CardDescription>Protocol, hostname, and timezone are configured here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Protocol"
              value={form.wordpressSiteProtocol}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  wordpressSiteProtocol: value as 'http' | 'https'
                }))
              }
              options={[
                { value: 'https', label: 'HTTPS (recommended)' },
                { value: 'http', label: 'HTTP' }
              ]}
            />
            <Field
              label="Hostname"
              value={form.wordpressSiteHostname}
              onChange={(value) => setForm((current) => ({ ...current, wordpressSiteHostname: value }))}
              placeholder="example.com"
            />
            <SelectField
              label="Timezone"
              value={form.wordpressTimezone}
              onChange={(value) => setForm((current) => ({ ...current, wordpressTimezone: value }))}
              options={timezoneOptions}
            />
            <Field
              label="Username"
              value={form.wordpressUsername}
              onChange={(value) => setForm((current) => ({ ...current, wordpressUsername: value }))}
            />
            <Field
              label="Application password"
              type="password"
              value={form.wordpressApplicationPassword}
              onChange={(value) =>
                setForm((current) => ({ ...current, wordpressApplicationPassword: value }))
              }
              placeholder={settings.wordpressPasswordConfigured ? 'Configured' : ''}
            />
            <Field
              label="Plugin token"
              type="password"
              value={form.wordpressPluginToken}
              onChange={(value) => setForm((current) => ({ ...current, wordpressPluginToken: value }))}
              placeholder={settings.pluginTokenConfigured ? 'Configured' : ''}
            />
          </CardContent>
        </Card>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

function loadBrowserConfig(): Partial<SettingsForm> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SettingsForm>) : null;
  } catch {
    return null;
  }
}

function saveBrowserConfig(config: SettingsForm) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage failures; save-to-server still works.
  }
}

function buildSiteUrl(protocol: 'http' | 'https', hostname: string) {
  if (!hostname.trim()) {
    return '';
  }

  return `${protocol}://${hostname.trim().replace(/^\/+/, '')}`;
}

function buildTimezoneOptions() {
  const known = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const fallback = ['UTC', 'Australia/Brisbane', 'America/New_York', 'Europe/London'];
  const values = known.length ? known : fallback;

  return values.map((value) => ({ value, label: value }));
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
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
