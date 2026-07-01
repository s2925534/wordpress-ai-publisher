import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscoveryClient } from '@/app/site-discovery/discovery-client';
import { DiscoveryService } from '@/server/discovery-service';

const siteKey = process.env.DEFAULT_SITE_KEY ?? 'default-site';

export default async function SiteDiscoveryPage() {
  const service = new DiscoveryService(process.env.CONFIG_DIR ?? './config');
  const site = await service.getDefaultSiteRecord();
  const snapshot = await service.getLatestSnapshot(siteKey);
  const selectedSiteUrl = snapshot?.siteUrl ?? site.siteUrl;
  const selectedSiteName = resolveSelectedSiteName(snapshot?.siteName ?? site.name, selectedSiteUrl);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-soft backdrop-blur">
          <Badge>Site discovery</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Site discovery</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This page caches the selected WordPress site structure so the app can reuse live
            categories, tags, authors, and Jetpack status without assuming a generic WordPress
            setup. The app token and the plugin token must match; if discovery falls back, the
            page now shows the reason.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Selected site</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{selectedSiteName}</span>
              <span className="text-slate-400">·</span>
              <span className="font-medium text-teal-700">{selectedSiteUrl}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Last discovery data is cached locally and can be refreshed from the selected plugin.
            If the plugin is installed, confirm the same token exists in app Settings and in
            WordPress `Settings -&gt; Publisher Plugin`.
          </CardContent>
        </Card>

        <DiscoveryClient
          siteKey={siteKey}
          initialSnapshot={
            snapshot
              ? {
                  siteName: snapshot.siteName,
                  siteUrl: snapshot.siteUrl,
                  timezone: snapshot.timezone,
                  locale: snapshot.locale,
                  restApiAvailable: snapshot.restApiAvailable,
                  categories: Array.isArray(snapshot.categories) ? (snapshot.categories as Array<{ id: number; name: string }>) : [],
                  tags: Array.isArray(snapshot.tags) ? (snapshot.tags as Array<{ id: number; name: string }>) : [],
                  authors: Array.isArray(snapshot.authors) ? (snapshot.authors as Array<{ id: number; name: string }>) : [],
                  recentPosts: Array.isArray(snapshot.recentPosts) ? (snapshot.recentPosts as Array<{ id: number; title: string; status: string }>) : [],
                  jetpackStatus: {
                    installed: Boolean((snapshot.jetpackStatus as { installed?: boolean } | null)?.installed),
                    active: Boolean((snapshot.jetpackStatus as { active?: boolean } | null)?.active),
                    connected: Boolean((snapshot.jetpackStatus as { connected?: boolean } | null)?.connected),
                    socialAvailable: Boolean((snapshot.jetpackStatus as { socialAvailable?: boolean } | null)?.socialAvailable)
                  },
                  mediaSettings: {
                    maxUploadSize: (snapshot.mediaSettings as { maxUploadSize?: number | null } | null)?.maxUploadSize ?? null,
                    mimeTypes: Array.isArray((snapshot.mediaSettings as { mimeTypes?: string[] } | null)?.mimeTypes)
                      ? (snapshot.mediaSettings as { mimeTypes?: string[] }).mimeTypes ?? []
                      : []
                  }
                }
              : null
          }
        />
      </div>
    </main>
  );
}

function resolveSelectedSiteName(name: string | null | undefined, siteUrl: string) {
  const trimmed = name?.trim();
  if (trimmed && !/^example wordpress site$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    return new URL(siteUrl).hostname.replace(/^www\./i, '');
  } catch {
    return 'Configured site';
  }
}
