'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const body = isRegister ? { email, name, password, role } : { email, password };
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setBusy(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="dz-card space-y-4 p-6">
      {isRegister && (
        <label className="block">
          <span className="dz-label">Name</span>
          <input
            className="dz-input mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>
      )}

      <label className="block">
        <span className="dz-label">Email</span>
        <input
          className="dz-input mt-1.5"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="dz-label">Password</span>
        <input
          className="dz-input mt-1.5"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={isRegister ? 8 : 1}
        />
        {isRegister && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
      </label>

      {isRegister && (
        <fieldset>
          <span className="dz-label">I am a</span>
          <div className="mt-1.5 flex gap-2">
            {(['student', 'teacher'] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="switch"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={`dz-btn flex-1 ${role === r ? 'dz-btn-primary' : ''}`}
              >
                {r === 'student' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>
          <span className="mt-1 block text-xs text-muted">
            Teacher accounts can see the whole cohort&rsquo;s progress.
          </span>
        </fieldset>
      )}

      {error && (
        <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button className="dz-btn dz-btn-primary w-full" type="submit" disabled={busy}>
        {busy ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already enrolled?{' '}
            <Link href="/login" className="dz-link">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{' '}
            <Link href="/register" className="dz-link">
              Enrol
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
