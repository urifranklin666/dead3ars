import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in — dead3ars' };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <header className="space-y-2">
        <p className="dz-label">Return to your coursework</p>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      </header>
      <AuthForm mode="login" />
    </div>
  );
}
