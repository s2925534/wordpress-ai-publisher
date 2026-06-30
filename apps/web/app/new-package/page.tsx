import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewPackageClient } from '@/app/new-package/package-client';

export default function NewPackagePage() {
  const defaultSiteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site';
  const defaultContentProfileKey = process.env.DEFAULT_CONTENT_PROFILE_KEY ?? 'linkedin-blog-package';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-soft backdrop-blur">
          <Badge>New package</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Generate a publication package</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Paste rough notes, choose a source safety type, and generate a validated content package
            using the default config profile when no site-specific config is selected yet.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Content generation</CardTitle>
            <CardDescription>
              This slice uses the mock AI provider and strict Zod validation so the package can be
              edited safely before anything is published later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewPackageClient defaultSiteKey={defaultSiteKey} defaultContentProfileKey={defaultContentProfileKey} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
