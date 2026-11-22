import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Enroll — Blackwire' };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <header className="space-y-2">
        <p className="dz-label">Start the course</p>
        <h1 className="text-3xl font-bold tracking-tight">Enroll</h1>
        <p className="text-sm text-muted">
          Choose <strong className="text-ink">Student</strong> to work through the material,
          or <strong className="text-ink">Teacher</strong> to supervise a cohort.
        </p>
      </header>
      <AuthForm mode="register" />
      <p className="text-center text-xs leading-relaxed text-muted">
        Need an invite code or running a university or security-team pilot?{' '}
        <a
          href="mailto:hello@deadplug.digital?subject=Blackwire%20Invite%20Request"
          className="dz-link"
        >
          Email hello@deadplug.digital
        </a>
        .
      </p>
    </div>
  );
}
