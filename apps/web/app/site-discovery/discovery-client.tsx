'use client';

import { useMemo, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Snapshot = {
  siteName: string;
  siteUrl: string;
  timezone?: string | null;
  locale?: string | null;
  restApiAvailable: boolean;
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  authors: Array<{ id: number; name: string }>;
  recentPosts: Array<{ id: number; title: string; status: string }>;
  jetpackStatus: {
    installed: boolean;
    active: boolean;
    connected: boolean;
    socialAvailable: boolean;
  };
  mediaSettings: {
    maxUploadSize?: number | null;
    mimeTypes: string[];
  };
};

type Props = {
  siteKey: string;
  initialSnapshot: Snapshot | null;
};

type DiscoveryResponse = {
  snapshot: Snapshot;
  refreshed: boolean;
  source: 'plugin' | 'fallback';
  errorMessage?: string;
};

export function DiscoveryClient({ siteKey, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initialSnapshot);
  const [message, setMessage] = useState('Ready to refresh discovery.');
  const [isPending, startTransition] = useTransition();
  const [source, setSource] = useState<'plugin' | 'fallback' | 'unknown'>('unknown');

  const categoriesCount = snapshot?.categories.length ?? 0;
  const tagsCount = snapshot?.tags.length ?? 0;

  const summary = useMemo(() => {
    if (!snapshot) {
      return 'No discovery snapshot cached yet.';
    }

    return `Last discovery snapshot for ${snapshot.siteName}`;
  }, [snapshot]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <Badge>Cached discovery</Badge>
          <Button
            onClick={() => {
              startTransition(async () => {
                setMessage('Refreshing discovery...');
                const response = await fetch(`/api/sites/${siteKey}/discovery`, {
                  method: 'POST'
                });
                const payload = (await response.json()) as {
                  data?: DiscoveryResponse;
                  success: boolean;
                };

                if (payload.success && payload.data?.snapshot) {
                  setSnapshot(payload.data.snapshot);
                  setSource(payload.data.source ?? 'unknown');

                  if (payload.data.source === 'plugin' && payload.data.refreshed) {
                    setMessage('Discovery refreshed from the plugin.');
                  } else {
                    setMessage(
                      payload.data.errorMessage
                        ? `Discovery used fallback data: ${payload.data.errorMessage}`
                        : 'Discovery used fallback data.'
                    );
                  }
                } else {
                  setMessage('Discovery refresh failed.');
                }
              });
            }}
            disabled={isPending}
          >
            {isPending ? 'Refreshing...' : 'Refresh discovery'}
          </Button>
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{summary}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">
          Source: {source === 'unknown' ? 'Not refreshed yet' : source}
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Stat label="Site URL" value={snapshot?.siteUrl ?? 'Not discovered yet'} />
          <Stat label="REST API" value={snapshot?.restApiAvailable ? 'Available' : 'Unavailable'} />
          <Stat label="Categories" value={String(categoriesCount)} />
          <Stat label="Tags" value={String(tagsCount)} />
          <Stat label="Authors" value={String(snapshot?.authors.length ?? 0)} />
          <Stat
            label="Jetpack Social"
            value={snapshot?.jetpackStatus.socialAvailable ? 'Available' : 'Unavailable'}
          />
        </dl>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-lg font-semibold">Snapshot details</h3>
        {snapshot ? (
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <Detail label="Timezone" value={snapshot.timezone ?? 'Unknown'} />
            <Detail label="Locale" value={snapshot.locale ?? 'Unknown'} />
            <Detail label="Media upload" value={snapshot.mediaSettings.maxUploadSize ? 'Supported' : 'Unknown'} />
            <Detail label="Recent posts" value={String(snapshot.recentPosts.length)} />
            <Detail label="Categories" value={snapshot.categories.map((item) => item.name).join(', ') || 'None'} />
            <Detail label="Tags" value={snapshot.tags.map((item) => item.name).join(', ') || 'None'} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Run discovery to cache live categories, tags, authors, and Jetpack status.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}
