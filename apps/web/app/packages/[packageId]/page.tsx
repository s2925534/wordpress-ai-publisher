import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageEditorClient } from '@/app/packages/[packageId]/package-editor-client';
import { PackageService } from '@/server/package-service';

export default async function PackagePage({
  params
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const service = new PackageService(process.env.CONFIG_DIR ?? './config');
  const record = await service.getPackage(packageId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-soft backdrop-blur">
          <Badge>Final confirmation</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Review package and publish</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Edit the generated package, prepare the featured image, and choose draft, publish, or
            schedule only after explicit confirmation.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Package editor</CardTitle>
            <CardDescription>{record.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <PackageEditorClient
              packageId={packageId}
              initialPackage={JSON.parse(JSON.stringify(record))}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
