'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RemoveAssignmentButton({ classId, moduleId }: { classId: number; moduleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch(`/api/classes/${classId}/assignments?moduleId=${encodeURIComponent(moduleId)}`, {
      method: 'DELETE',
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" className="text-xs text-muted hover:text-danger" onClick={remove} disabled={busy}>
      {busy ? 'removing…' : 'remove'}
    </button>
  );
}
