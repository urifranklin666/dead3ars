'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Status } from '@/lib/progress';

/* Fires once per visit to record that the student opened the module; the server
 * keeps progress monotonic, so revisiting cannot demote it. Renders the explicit
 * "completed the lab" control, which is the only client-assertable step. */
export function ProgressControls({
  moduleId,
  initialStatus,
  signedIn,
}: {
  moduleId: string;
  initialStatus: Status | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, status: 'engaged' }),
    })
      .then(() => router.refresh())
      .catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [moduleId, signedIn]);

  async function markLabComplete() {
    setBusy(true);
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, status: 'lab-complete' }),
    });
    setBusy(false);
    if (res.ok) {
      setStatus((s) => (s === 'assessment-passed' ? s : 'lab-complete'));
      router.refresh();
    }
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-muted">
        Sign in and progress through this module will be recorded.
      </p>
    );
  }

  const done = status === 'lab-complete' || status === 'assessment-passed';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={done ? 'dz-btn' : 'dz-btn dz-btn-primary'}
        disabled={busy || done}
        onClick={markLabComplete}
      >
        {done ? '✓ Lab marked complete' : busy ? 'Recording…' : 'Mark the lab complete'}
      </button>
      <span className="text-sm text-muted">
        {status === 'assessment-passed'
          ? 'Assessment passed.'
          : status === 'lab-complete'
            ? 'Finish the assessment below to complete the module.'
            : 'Checked nothing off yet — the lab comes first, then the assessment.'}
      </span>
    </div>
  );
}
