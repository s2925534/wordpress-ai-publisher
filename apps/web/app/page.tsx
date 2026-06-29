import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const phaseOneSteps = [
  'Strict TypeScript and app shell',
  'Tailwind and shadcn-style primitives',
  'Prisma and SQLite scaffold',
  'Generic JSON config templates',
  'Quick-start and commit automation'
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.15),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(30,41,59,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Phase 1 foundation</Badge>
            <span className="text-sm text-slate-600">Generic, config-driven, local-first</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            WordPress AI Publishing Assistant
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
            This scaffold sets up the application shell, config validation, and local development
            workflow for a future WordPress publishing assistant.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Open dashboard
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200"
            >
              Open settings
            </Link>
            <Link
              href="/site-discovery"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              Site discovery
            </Link>
            <Link
              href="/new-package"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              New package
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>What is included</CardTitle>
              <CardDescription>Foundation pieces plus WordPress discovery plumbing.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700">
                {phaseOneSteps.map((step) => (
                  <li key={step} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {step}
                  </li>
                ))}
                <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  AI generation foundation and package preview
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next action</CardTitle>
              <CardDescription>Run the setup script and add your WordPress site URL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <p>
                The first meaningful user action is the one-command bootstrap:
                <code className="ml-1 rounded bg-slate-100 px-2 py-1 text-xs">./scripts/quick-start.sh</code>
              </p>
              <p>
                After startup, credentials and site settings live in the app UI or JSON config
                files.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
