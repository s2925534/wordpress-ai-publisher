import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildSettingsCompletionStatus } from '@/lib/settings-summary';

const status = buildSettingsCompletionStatus({});

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-soft backdrop-blur">
          <Badge>Dashboard</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">WordPress AI Publishing Assistant</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Phase 2 adds the persistence and settings surface needed before WordPress discovery and
            publishing logic land.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Open settings
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200"
            >
              Home
            </Link>
            <Link
              href="/site-discovery"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              Site discovery
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Settings completion</CardTitle>
              <CardDescription>Required values still missing from the local setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>{status.configured ? 'All required settings are present.' : 'Setup is incomplete.'}</p>
              <ul className="list-disc space-y-1 pl-5">
                {status.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next workflow</CardTitle>
              <CardDescription>What this app will support after the remaining phases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>Discover the selected WordPress site.</p>
              <p>Generate the publication package and SEO package.</p>
              <p>Assign categories, tags, and featured image with alt text.</p>
              <p>Confirm before draft creation or publishing.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
