'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* The join code, plus the two destructive-ish actions on a class: rotating the
 * code (invalidates the old one) and deleting the class. Both are confirm-gated
 * because neither can be undone from the UI. */
export function ClassCodePanel({
  classId,
  code,
  redirectAfterDelete,
}: {
  classId: number;
  code: string;
  redirectAfterDelete?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: 'PATCH' | 'DELETE', body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/classes/${classId}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return false;
    }
    return true;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Your browser blocked the clipboard — select the code and copy it manually.');
    }
  }

  async function rotate() {
    if (!confirm('Rotate the join code? Anyone holding the old code can no longer join.')) return;
    if (await call('PATCH', { rotateCode: true })) router.refresh();
  }

  async function remove() {
    if (!confirm('Delete this class and all of its assignments? Student progress is not deleted.')) return;
    if (await call('DELETE')) {
      if (redirectAfterDelete) router.push(redirectAfterDelete as never);
      else router.refresh();
    }
  }

  return (
    <div className="dz-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="dz-label">Join code</p>
          <p className="mt-1 font-mono text-lg tracking-widest text-accent">{code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="dz-btn text-sm" onClick={copy} disabled={busy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button type="button" className="dz-btn text-sm" onClick={rotate} disabled={busy}>
            Rotate
          </button>
          <button
            type="button"
            className="dz-btn text-sm border-danger/50 text-danger hover:border-danger"
            onClick={remove}
            disabled={busy}
          >
            Delete class
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Students enter this code on their dashboard to enrol. Rotating it locks out anyone
        who has the old one but leaves current members enrolled.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
