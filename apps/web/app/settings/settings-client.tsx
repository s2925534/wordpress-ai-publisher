'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_AI_PROVIDER,
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_TEXT_MODEL,
  IMAGE_MODEL_OPTIONS,
  TEXT_MODEL_OPTIONS
} from '@/lib/ai-defaults';
import { AiSafeguardsEditor } from '@/components/ai-safeguards-editor';
import { defaultAiSafeguard, normalizeAiSafeguards, type AiSafeguard } from '@/lib/ai-safeguards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { Input } from '@/components/ui/input';
import { loadBrowserConfig, saveBrowserConfig } from '@/lib/browser-config-storage';

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
  wordpressPluginToken: string;
  aiSafeguards: AiSafeguard[];
  selectedAiSafeguardId: string;
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
  aiSafeguards: AiSafeguard[];
  selectedAiSafeguardId: string;
};

type Props = {
  initialSettings: SettingsPayload;
};

export function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SettingsForm>({
    aiProvider: initialSettings.aiProvider || DEFAULT_AI_PROVIDER,
    openAiApiKey: '',
    openAiTextModel: initialSettings.openAiTextModel || DEFAULT_OPENAI_TEXT_MODEL,
    openAiImageModel: initialSettings.openAiImageModel || DEFAULT_OPENAI_IMAGE_MODEL,
    wordpressSiteProtocol: initialSettings.wordpressSiteProtocol,
    wordpressSiteHostname: initialSettings.wordpressSiteHostname,
    wordpressTimezone: initialSettings.wordpressTimezone,
    wordpressSiteUrl: initialSettings.wordpressSiteUrl,
    wordpressUsername: initialSettings.wordpressUsername,
    wordpressApplicationPassword: '',
    wordpressPluginToken: initialSettings.wordpressPluginToken || '',
    aiSafeguards: normalizeAiSafeguards(initialSettings.aiSafeguards),
    selectedAiSafeguardId: initialSettings.selectedAiSafeguardId || defaultAiSafeguard.id
  });
  const [message, setMessage] = useState('Settings loaded.');
  const [isSaving, setIsSaving] = useState(false);
  const [browserConfigLoaded, setBrowserConfigLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    void loadBrowserConfig<SettingsForm>().then((saved) => {
      if (!isMounted) {
        return;
      }

      if (saved) {
        setForm((current) => ({
          ...current,
          ...saved,
          aiSafeguards: normalizeAiSafeguards(saved.aiSafeguards ?? current.aiSafeguards),
          selectedAiSafeguardId: saved.selectedAiSafeguardId ?? current.selectedAiSafeguardId
        }));
        setMessage('Loaded browser draft configuration.');
      }

      setBrowserConfigLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const url = buildSiteUrl(form.wordpressSiteProtocol, form.wordpressSiteHostname);
    setForm((current) => (current.wordpressSiteUrl === url ? current : { ...current, wordpressSiteUrl: url }));
  }, [form.wordpressSiteHostname, form.wordpressSiteProtocol]);

  useEffect(() => {
    if (!browserConfigLoaded) {
      return;
    }

    void saveBrowserConfig(form);
  }, [browserConfigLoaded, form]);

  const timezoneOptions = useMemo(() => buildTimezoneOptions(), []);
  const pluginSettingsUrl = useMemo(
    () => buildPluginSettingsUrl(form.wordpressSiteUrl, form.wordpressPluginToken),
    [form.wordpressPluginToken, form.wordpressSiteUrl]
  );

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

  function generatePluginToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = bytesToHex(bytes);
    setForm((current) => ({ ...current, wordpressPluginToken: token }));
    setMessage('Generated a new plugin token.');
  }

  async function copyPluginToken() {
    if (!form.wordpressPluginToken) {
      setMessage('Generate or paste a plugin token first.');
      return;
    }

    await navigator.clipboard.writeText(form.wordpressPluginToken);
    setMessage('Plugin token copied to clipboard.');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge>{settings.completion.configured ? 'Configured' : 'Incomplete'}</Badge>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{settings.defaultSiteKey}</span>
          </div>
          <CardTitle>Setup status</CardTitle>
          <CardDescription>
            Configuration is edited in the web form, encrypted in browser storage, and saved to the
            local database when you click save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <StatusRow label="OpenAI API key" configured={settings.openAiKeyConfigured} />
          <StatusRow label="WordPress password" configured={settings.wordpressPasswordConfigured} />
          <StatusRow label="Plugin token (optional)" configured={settings.pluginTokenConfigured} />
          <StatusRow
            label="Site URL"
            configured={settings.wordpressSiteConfigured}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Site URL preview</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="break-all text-sm font-medium text-teal-700">
                {form.wordpressSiteUrl || 'Not set'}
              </p>
              <CopyButton
                value={form.wordpressSiteUrl}
                className="h-8 rounded-lg px-3 py-1 text-xs"
              />
            </div>
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
            <CardTitle>WordPress Plugin</CardTitle>
            <CardDescription>
              Download the plugin zip from the app, install it inside WordPress, and use the
              token controls in the WordPress Site section above when you want plugin-backed
              discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="/api/plugin/package"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Download plugin zip
            </a>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-slate-900">Install checklist</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Download the zip from this app.</li>
                <li>Upload it in WordPress under Plugins.</li>
                <li>Activate the plugin.</li>
                <li>Generate or copy the plugin token in the WordPress Site section above.</li>
              </ol>
            </div>
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
              required
            />
            <Field
              label="OpenAI API key"
              type="password"
              value={form.openAiApiKey}
              onChange={(value) => setForm((current) => ({ ...current, openAiApiKey: value }))}
              placeholder={settings.openAiKeyConfigured ? 'Configured' : ''}
              invalid={!settings.openAiKeyConfigured && !form.openAiApiKey.trim()}
              warning="OpenAI API key is required before real AI generation."
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
            <CardTitle>AI Safeguards</CardTitle>
            <CardDescription>
              Configure how prompts should be interpreted during generation. The selected safeguard
              is shared with the New Package popup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiSafeguardsEditor
              safeguards={form.aiSafeguards}
              selectedId={form.selectedAiSafeguardId}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  aiSafeguards: next.safeguards,
                  selectedAiSafeguardId: next.selectedId
                }))
              }
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
              required
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
              required
            />
            <Field
              label="Application password"
              type="password"
              value={form.wordpressApplicationPassword}
              onChange={(value) =>
                setForm((current) => ({ ...current, wordpressApplicationPassword: value }))
              }
              placeholder={settings.wordpressPasswordConfigured ? 'Configured' : ''}
              invalid={!settings.wordpressPasswordConfigured && !form.wordpressApplicationPassword.trim()}
              warning="WordPress application password is required before publishing."
            />
            <Field
              label="Plugin token"
              value={form.wordpressPluginToken}
              onChange={(value) => setForm((current) => ({ ...current, wordpressPluginToken: value }))}
              placeholder={settings.pluginTokenConfigured ? 'Configured' : 'Generate one here'}
            />
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button variant="secondary" onClick={generatePluginToken}>
                Generate token
              </Button>
              <Button variant="secondary" onClick={copyPluginToken}>
                Copy token
              </Button>
              {pluginSettingsUrl ? (
                <a
                  href={pluginSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
                >
                  Open plugin settings with token
                </a>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Optional until you install the custom WordPress plugin. Generate one here, then open
              the plugin settings link to prefill the WordPress field. WordPress will still ask you
              to save the plugin settings.
            </p>
          </CardContent>
        </Card>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

function buildSiteUrl(protocol: 'http' | 'https', hostname: string) {
  if (!hostname.trim()) {
    return '';
  }

  return `${protocol}://${hostname.trim().replace(/^\/+/, '')}`;
}

function buildPluginSettingsUrl(siteUrl: string, token: string) {
  if (!siteUrl.trim() || !token.trim()) {
    return '';
  }

  try {
    const url = new URL('/wp-admin/options-general.php', siteUrl);
    url.searchParams.set('page', 'publisher-plugin');
    url.hash = new URLSearchParams({ publisher_plugin_token: token.trim() }).toString();
    return url.toString();
  } catch {
    return '';
  }
}

function buildTimezoneOptions() {
  const known = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const fallback = ['UTC', 'Australia/Brisbane', 'America/New_York', 'Europe/London'];
  const values = known.length ? known : fallback;

  return values.map((value) => ({ value, label: value }));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function StatusRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className={configured ? 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2' : 'flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2'}>
      <span className="font-semibold text-slate-800">{label}</span>
      <span className={configured ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
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
  placeholder,
  required = false,
  invalid = false,
  warning
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  warning?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isInvalid = invalid || (required && !value.trim());
  const warningText = warning ?? (required && !value.trim() ? `${label} is required.` : undefined);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={isInvalid}
        className={isInvalid ? 'border-red-500 bg-red-50/40 focus:border-red-600 focus:ring-red-200' : undefined}
      />
      {isInvalid && warningText ? <p className="text-xs font-semibold text-red-700">{warningText}</p> : null}
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
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
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
