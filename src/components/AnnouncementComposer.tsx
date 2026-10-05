'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* Post an announcement to a class. Shown only to the class's teacher. */
export function AnnouncementComposer({ classId }: { classId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/classes/${classId}/announcements`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not post the announcement.');
      return;
    }
    setTitle('');
    setBody('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="dz-btn" onClick={() => setOpen(true)}>
        + Announcement
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-md border border-line bg-panel-2 p-4">
      <label className="block">
        <span className="dz-label">Title (optional)</span>
        <input
          className="dz-input mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lab 3 due date moved"
          maxLength={200}
        />
      </label>
      <textarea
        className="dz-input min-h-24 resize-y leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What the class needs to know."
        maxLength={20000}
        required
      />
      <div className="flex items-center gap-2">
        <button className="dz-btn dz-btn-primary text-sm" type="submit" disabled={busy || body.trim() === ''}>
          {busy ? 'Posting…' : 'Post'}
        </button>
        <button type="button" className="dz-btn text-sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  );
}
