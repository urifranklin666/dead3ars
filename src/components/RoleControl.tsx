'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/* Change a user's role. Refuses to touch your own row (the API blocks
 * self-demotion too, so an admin cannot lock themselves out). */
export function RoleControl({
  userId,
  role,
  self,
}: {
  userId: number;
  role: string;
  self: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    if (next === role) return;
    if (!confirm(`Change this account's role to ${next}?`)) return;
    setBusy(true);
    setError(null);

    const res = await fetch('/api/admin/role', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role: next }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not change the role.');
      return;
    }
    router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      <select
        className="dz-input py-1 text-xs"
        value={role}
        onChange={(e) => change(e.target.value)}
        disabled={busy || self}
        title={self ? 'You cannot change your own role.' : undefined}
      >
        <option value="student">student</option>
        <option value="teacher">teacher</option>
        <option value="admin">admin</option>
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
