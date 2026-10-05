'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Criterion {
  name: string;
  description: string;
  points: number;
}

/* The assignment's rubric: the criteria a student is graded against. Kept as a
 * plain list so it can be shown read-only on the student side and edited here. */
export function RubricEditor({ assignmentId, initial }: { assignmentId: number; initial: Criterion[] }) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = criteria.reduce((n, c) => n + (Number(c.points) || 0), 0);
  const dirty = JSON.stringify(criteria) !== JSON.stringify(initial);

  function update(i: number, patch: Partial<Criterion>) {
    setCriteria((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rubric: criteria.filter((c) => c.name.trim() !== '') }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not save the rubric.');
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="dz-label">
            Rubric {total > 0 && <span className="text-muted">· {total} points</span>}
          </p>
          <button type="button" className="text-xs text-muted hover:text-accent" onClick={() => setEditing(true)}>
            edit
          </button>
        </div>
        {criteria.length === 0 ? (
          <p className="text-sm text-muted">
            No rubric yet. A rubric tells students what you are looking for before they submit.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {criteria.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-xs text-muted">{String(c.points).padStart(2, '0')}</span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  {c.description && <span className="block text-muted">{c.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="dz-label">Rubric · {total} points</p>
        <button
          type="button"
          className="text-xs text-muted hover:text-accent"
          onClick={() => setCriteria([...criteria, { name: '', description: '', points: 1 }])}
        >
          + add criterion
        </button>
      </div>

      {criteria.map((c, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-panel-2 p-2">
          <label className="min-w-[10rem] flex-1">
            <span className="dz-label">Criterion</span>
            <input
              className="dz-input mt-1"
              value={c.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="e.g. Reconnaissance quality"
              maxLength={120}
            />
          </label>
          <label className="min-w-[14rem] flex-[2]">
            <span className="dz-label">What earns the marks</span>
            <input
              className="dz-input mt-1"
              value={c.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="optional"
              maxLength={500}
            />
          </label>
          <label>
            <span className="dz-label">Pts</span>
            <input
              className="dz-input mt-1 w-16"
              type="number"
              min={0}
              max={1000}
              value={c.points}
              onChange={(e) => update(i, { points: Number(e.target.value) })}
            />
          </label>
          <button
            type="button"
            className="pb-2 text-xs text-muted hover:text-danger"
            onClick={() => setCriteria((cs) => cs.filter((_, j) => j !== i))}
          >
            remove
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button className="dz-btn dz-btn-primary text-sm" type="button" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save rubric'}
        </button>
        <button
          type="button"
          className="dz-btn text-sm"
          onClick={() => {
            setCriteria(initial);
            setEditing(false);
          }}
          disabled={busy}
        >
          Cancel
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}
