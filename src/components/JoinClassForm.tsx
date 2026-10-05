'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function JoinClassForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setJoined(null);

    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; klass?: { name: string } };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setCode('');
    setJoined(data.klass?.name ?? 'the class');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="dz-label">Join a class</span>
          <input
            className="dz-input mt-1.5 font-mono uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DZ-XXXXXX"
            maxLength={32}
            required
          />
        </label>
        <button className="dz-btn dz-btn-primary" type="submit" disabled={busy || code.trim() === ''}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </div>
      {joined && <p className="text-sm text-accent-2">You are enrolled in {joined}.</p>}
      {error && (
        <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </form>
  );
}
