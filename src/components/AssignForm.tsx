'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface AssignableModule {
  id: string;
  title: string;
  order: number;
}

/* Assign a module to a class, with an optional due date. Modules already
 * assigned (or whose assignment was removed elsewhere) are filtered server-side
 * into `assignable`, so the select always reflects something real to add. */
export function AssignForm({
  classId,
  assignable,
  canRotate,
}: {
  classId: number;
  assignable: AssignableModule[];
  canRotate: boolean;
}) {
  const router = useRouter();
  const [moduleId, setModuleId] = useState(assignable[0]?.id ?? '');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleId) return;
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, dueAt: dueAt || null }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setDueAt('');
    router.refresh();
  }

  if (assignable.length === 0) {
    return (
      <p className="text-sm text-muted">
        Every module in the curriculum is already assigned to this class.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="min-w-[16rem] flex-1">
        <span className="dz-label">Module</span>
        <select
          className="dz-input mt-1.5"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          disabled={!canRotate}
          aria-label="Module to assign"
        >
          {assignable.map((m) => (
            <option key={m.id} value={m.id}>
              {String(m.order).padStart(2, '0')} · {m.title}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="dz-label">Due (optional)</span>
        <input
          className="dz-input mt-1.5"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          disabled={!canRotate}
        />
      </label>

      <button className="dz-btn dz-btn-primary" type="submit" disabled={busy || !moduleId}>
        {busy ? 'Assigning…' : 'Assign'}
      </button>

      {error && (
        <p className="w-full rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
