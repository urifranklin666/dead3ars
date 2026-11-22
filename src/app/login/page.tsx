import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in — dead3ars' };

export default function LoginPage() {
  /* Surfaced only when the instance is explicitly marked as a demo, so a real
   * deployment never advertises credentials. */
  const demo = process.env.DZ_DEMO === '1';

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <header className="space-y-2">
        <p className="dz-label">Return to your coursework</p>
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted">
          Pick up where you left off. Your progress, notes, and classwork are tied to this account.
        </p>
      </header>

      {demo && (
        <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs leading-relaxed text-warn">
          <strong>Demo instance.</strong> Seeded accounts: teacher@dead3ars.test ·{' '}
          <span className="font-mono">teacher-pass-2026</span> · student@dead3ars.test ·{' '}
          <span className="font-mono">student-pass-2026</span> · admin@dead3ars.test ·{' '}
          <span className="font-mono">admin-pass-2026</span>
        </div>
      )}

      <AuthForm mode="login" />
    </div>
  );
}
