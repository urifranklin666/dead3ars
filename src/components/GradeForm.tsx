'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* The teacher's grading controls for one student on one assignment. Save writes
 * a score/max and feedback; remove clears the grade and leaves the submission
 * intact, so a mark can be redone without re-collecting the work. */
export function GradeForm({
  assignmentId,
  studentId,
  max,
  initial,
}: {
  assignmentId: number;
  studentId: number;
  max: number;
  initial: { score: number; max: number; feedback: string; graded_at: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(initial ? String(initial.score) : '');
  const [maxScore, setMaxScore] = useState(String(initial?.max ?? max));
  const [feedback, setFeedback] = useState(initial?.feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/assignments/${assignmentId}/grades`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId, score: Number(score), max: Number(maxScore), feedback }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not save the grade.');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function clear() {
    if (!confirm('Remove this grade? The submission stays; only the mark and feedback are cleared.')) return;
    setBusy(true);
    await fetch(`/api/assignments/${assignmentId}/grades?studentId=${studentId}`, { method: 'DELETE' });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  const invalid = score === '' || maxScore === '' || Number(score) > Number(maxScore);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {initial ? (
          <span className="font-mono text-sm">
            <span className="text-accent-2">
              {initial.score}/{initial.max}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted">ungraded</span>
        )}
        <button type="button" className="dz-btn text-xs" onClick={() => setOpen(true)}>
          {initial ? 'Edit' : 'Grade'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-md border border-line bg-panel-2 p-3">
      <div className="flex items-end gap-2">
        <label>
          <span className="dz-label">Score</span>
          <input
            className="dz-input mt-1 w-20"
            type="number"
            min={0}
            max={1000}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            autoFocus
          />
        </label>
        <span className="pb-2 text-muted">/</span>
        <label>
          <span className="dz-label">Out of</span>
          <input
            className="dz-input mt-1 w-20"
            type="number"
            min={1}
            max={1000}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </label>
      </div>
      <textarea
        className="dz-input min-h-20 resize-y text-sm"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback for the student."
        maxLength={4000}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button className="dz-btn dz-btn-primary text-sm" type="submit" disabled={busy || invalid}>
          {busy ? 'Saving…' : 'Save grade'}
        </button>
        <button type="button" className="dz-btn text-sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        {initial && (
          <button
            type="button"
            className="dz-btn text-sm border-danger/50 text-danger"
            onClick={clear}
            disabled={busy}
          >
            Remove
          </button>
        )}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  );
}
