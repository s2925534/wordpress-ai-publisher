import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const oidcEnabled = process.env.ENABLE_OIDC_SSO === 'true';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
        <p className="text-sm text-slate-600">WordPress AI Publishing Assistant</p>
      </div>
      <LoginForm />
      {oidcEnabled ? (
        <a
          href="/api/auth/oidc/login"
          className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Sign in with SSO
        </a>
      ) : null}
    </div>
  );
}
