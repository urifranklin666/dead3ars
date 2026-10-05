'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* A student's submission form for one assignment. The rubric, if the teacher set
 * one, is rendered by the page above this — here is just the answer and a link.
 * Saving is a resubmission; the teacher sees the latest. */
export function WorkSubmission({
  assignmentId,
  initialBody,
  initialLink,
  submittedAt,
  locked = false,
}: {
  assignmentId: number;
  initialBody: string;
  initialLink: string;
  submittedAt: string | null;
  locked?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [link, setLink] = useState(initialLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(submittedAt);

  const dirty = body !== initialBody || link !== initialLink;
  const empty = body.trim() === '' && link.trim() === '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/assignments/${assignmentId}/submission`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, link }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; submission?: { submitted_at: string } };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not save.');
      return;
    }
    setSavedAt(data.submission?.submitted_at ?? savedAt);
    router.refresh();
  }

  if (locked) {
    return (
      <p className="text-sm text-muted">
        {savedAt ? `You submitted this on ${savedAt.slice(0, 10)}.` : 'You have not submitted this yet.'}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        className="dz-input min-h-32 resize-y leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your write-up: what you found, how, and what it means. Include the evidence a reader would need."
        maxLength={20000}
      />
      <label className="block">
        <span className="dz-label">Link (optional)</span>
        <input
          className="dz-input mt-1.5 font-mono text-sm"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://github.com/… or a paste URL"
          maxLength={500}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button className="dz-btn dz-btn-primary" type="submit" disabled={busy || empty || !dirty}>
          {busy ? 'Submitting…' : savedAt ? 'Resubmit' : 'Submit'}
        </button>
        <span className="text-xs text-muted">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : savedAt ? (
            <>
              Submitted {savedAt.slice(0, 16).replace('T', ' ')} UTC
              {dirty ? ' · unsaved edits' : ''}
            </>
          ) : (
            'Not submitted yet'
          )}
        </span>
      </div>
    </form>
  );
}
