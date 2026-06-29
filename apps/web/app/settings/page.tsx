import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const sections = [
  {
    title: 'AI Provider',
    description: 'Store your OpenAI key and model selection here after startup.'
  },
  {
    title: 'WordPress Site',
    description: 'Keep the site URL, username, and application password in app settings.'
  },
  {
    title: 'WordPress Plugin',
    description: 'Generate and manage the plugin token for REST endpoint authentication.'
  },
  {
    title: 'Content Profile',
    description: 'Adjust tags, hashtags, tone, SEO preferences, and image rules per site.'
  },
  {
    title: 'Publishing Defaults',
    description: 'Draft by default, publish only after explicit confirmation.'
  }
];

export default function SettingsPage() {
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

        <section className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder={`${section.title} value`} />
                <Textarea placeholder={`Notes for ${section.title.toLowerCase()}`} />
                <Button variant="secondary">Save {section.title}</Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
