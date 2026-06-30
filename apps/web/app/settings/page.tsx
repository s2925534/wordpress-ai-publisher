import { Badge } from '@/components/ui/badge';
import { SettingsClient } from '@/app/settings/settings-client';
import { SettingsService } from '@/server/settings-service';

export default async function SettingsPage() {
  const service = new SettingsService(process.env.CONFIG_DIR ?? './config');
  const settings = await service.getSettings();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <Badge>Setup and settings</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Application settings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Credentials are entered here after startup. Site-specific behavior should stay in
            config or database records rather than hard-coded logic.
          </p>
        </header>

        <SettingsClient initialSettings={settings} />
      </div>
    </main>
  );
}
