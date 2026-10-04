'use client';

import { useState } from 'react';

export function Notes({ moduleId, initialBody }: { moduleId: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = body !== saved;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, body }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not save.');
      return;
    }
    setSaved(body);
  }

  return (
    <div className="space-y-2">
      <textarea
        className="dz-input min-h-32 resize-y font-mono text-sm leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your own notes for this module — commands that worked, things to revisit, evidence to keep. Private to you."
      />
      <div className="flex items-center gap-3">
        <button type="button" className="dz-btn" disabled={!dirty || busy} onClick={save}>
          {busy ? 'Saving…' : 'Save notes'}
        </button>
        <span className="text-xs text-muted">
          {error ? <span className="text-danger">{error}</span> : dirty ? 'Unsaved changes' : saved ? 'Saved' : 'Empty'}
        </span>
      </div>
    </div>
  );
}
