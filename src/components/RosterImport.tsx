'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ImportResult {
  created: number;
  enrolled: number;
  existing: number;
  skipped: { line: number; reason: string }[];
  passwords: { email: string; password: string }[];
}

/* Bulk-add students. New emails get an account with a generated password shown
 * once here; existing ones are just enrolled. */
export function RosterImport({ classId }: { classId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const res = await fetch(`/api/classes/${classId}/roster/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<ImportResult> & { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? 'Could not import that roster.');
      return;
    }
    setResult(data as ImportResult);
    setCsv('');
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="dz-btn" onClick={() => setOpen(true)}>
        + Import students
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-md border border-line bg-panel-2 p-4">
      <label className="block">
        <span className="dz-label">Roster CSV</span>
        <textarea
          className="dz-input mt-1.5 min-h-28 resize-y font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={'name,email\nAda Lovelace,ada@school.edu\nGrace Hopper,grace@school.edu'}
          maxLength={200000}
          required
        />
      </label>
      <p className="text-xs text-muted">
        One student per line. A <code>name,email</code> or <code>email,name</code> header is
        optional; either column order works. Students who already have an account are enrolled
        without a new one; new accounts get a password you can copy below.
      </p>

      <div className="flex items-center gap-2">
        <button className="dz-btn dz-btn-primary text-sm" type="submit" disabled={busy || csv.trim() === ''}>
          {busy ? 'Importing…' : 'Import'}
        </button>
        <button type="button" className="dz-btn text-sm" onClick={() => setOpen(false)} disabled={busy}>
          Close
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>

      {result && (
        <div className="space-y-2 border-t border-line pt-3 text-sm">
          <p>
            <span className="text-accent-2">{result.created} new account(s)</span>
            {result.enrolled > 0 && ` · ${result.enrolled} enrolled`}
            {result.existing > 0 && ` · ${result.existing} already had an account`}
          </p>
          {result.passwords.length > 0 && (
            <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Generated passwords">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="dz-label py-2">Email</th>
                    <th className="dz-label py-2">Temporary password</th>
                  </tr>
                </thead>
                <tbody>
                  {result.passwords.map((p) => (
                    <tr key={p.email} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 font-mono">{p.email}</td>
                      <td className="py-1.5 font-mono text-accent-2">{p.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted">
            These passwords are shown once. Copy them now — they are not stored in plain text and
            cannot be retrieved later.
          </p>
          {result.skipped.length > 0 && (
            <details className="text-xs text-muted">
              <summary>{result.skipped.length} line(s) skipped</summary>
              <ul className="mt-1 space-y-0.5">
                {result.skipped.map((s, i) => (
                  <li key={i}>line {s.line}: {s.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  );
}
