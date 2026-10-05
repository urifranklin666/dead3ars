'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setName('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="dz-card p-5">
      <label className="block">
        <span className="dz-label">New class</span>
        <input
          className="dz-input mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CS 4700 — Autumn cohort"
          maxLength={120}
          required
        />
      </label>
      <p className="mt-2 text-xs text-muted">
        A class gets a join code you hand to your students; assigning a module puts it on
        their dashboard with an optional due date.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button className="dz-btn dz-btn-primary mt-4" type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create class'}
      </button>
    </form>
  );
}
