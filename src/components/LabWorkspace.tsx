'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LabViewer } from './LabViewer';

interface FlagDef {
  key: string;
  label: string;
  hint: string;
}

interface LabState {
  id: string;
  moduleId: string;
  status: string;
  captured: string[];
  totalFlags: number;
  flags: FlagDef[];
  startedAt: string;
  expiresAt: string;
}

export function LabWorkspace({
  moduleId,
  scenarioTitle,
  flags,
}: {
  moduleId: string;
  scenarioTitle: string;
  flags: FlagDef[];
}) {
  const router = useRouter();
  const [lab, setLab] = useState<LabState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [flagInput, setFlagInput] = useState('');
  const [flagMsg, setFlagMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ttlLabel, setTtlLabel] = useState('');

  useEffect(() => {
    if (!lab?.expiresAt) return;
    const update = () => {
      const rem = Math.max(0, Math.floor((new Date(lab.expiresAt).getTime() - Date.now()) / 1000));
      const h = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      setTtlLabel(h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };
    const t0 = setTimeout(update, 0);
    const id = setInterval(update, 30000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [lab?.expiresAt]);

  useEffect(() => {
    let active = true;
    fetch(`/api/labs/start?moduleId=${encodeURIComponent(moduleId)}`)
      .then((r) => r.json())
      .then((d: { lab?: LabState | null }) => {
        if (active) setLab(d.lab ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [moduleId]);

  const startLab = async () => {
    setBusy('starting');
    setError('');
    try {
      const res = await fetch('/api/labs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
      const data = (await res.json()) as { lab?: LabState; error?: string };
      if (!res.ok || !data.lab) throw new Error(data.error || 'Failed to launch VM');
      setLab(data.lab);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start VM');
    } finally {
      setBusy(null);
    }
  };

  const resetLab = async () => {
    if (!lab) return;
    setBusy('resetting');
    setError('');
    try {
      const res = await fetch(`/api/labs/${lab.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = (await res.json()) as { lab?: LabState; error?: string };
      if (!res.ok || !data.lab) throw new Error(data.error || 'Failed to reset VM');
      setLab(data.lab);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset VM');
    } finally {
      setBusy(null);
    }
  };

  const stopLab = async () => {
    if (!lab) return;
    setBusy('stopping');
    setError('');
    try {
      await fetch(`/api/labs/${lab.id}`, { method: 'DELETE' });
      setLab(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop VM');
    } finally {
      setBusy(null);
    }
  };

  const submitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lab || !flagInput.trim()) return;
    setFlagMsg(null);
    try {
      const res = await fetch(`/api/labs/${lab.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag', flag: flagInput.trim() }),
      });
      const data = (await res.json()) as {
        correct?: boolean;
        flagKey?: string;
        alreadyCaptured?: boolean;
        allCaptured?: boolean;
        captured?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      if (data.correct) {
        setLab((prev) => (prev ? { ...prev, captured: data.captured || prev.captured } : prev));
        setFlagInput('');
        setFlagMsg({
          ok: true,
          text: data.allCaptured
            ? `Captured [${data.flagKey}] — all objectives complete! Lab marked complete.`
            : data.alreadyCaptured
              ? `Flag [${data.flagKey}] was already captured.`
              : `Captured [${data.flagKey}]!`,
        });
        if (data.allCaptured) router.refresh();
      } else {
        setFlagMsg({ ok: false, text: 'Incorrect flag — check the exact FLAG{...} string.' });
      }
    } catch (err) {
      setFlagMsg({ ok: false, text: err instanceof Error ? err.message : 'Submission error' });
    }
  };

  const capturedSet = new Set(lab?.captured ?? []);
  const pct = flags.length ? Math.round((capturedSet.size / flags.length) * 100) : 0;

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-accent/30 bg-panel-2/60 p-4 shadow-[0_0_40px_-20px_rgba(255,59,78,0.25)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="dz-label flex items-center gap-2 text-accent">
            <span className={`inline-block h-2 w-2 rounded-full ${lab ? 'animate-pulse bg-accent-2' : 'bg-accent/60'}`} />
            Blackwire Cyber Range
          </p>
          <p className="mt-0.5 text-sm font-semibold">{scenarioTitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!lab ? (
            <button
              type="button"
              onClick={startLab}
              disabled={loading || busy !== null}
              className="dz-btn dz-btn-primary"
            >
              {busy === 'starting' ? 'Spawning VM…' : 'Launch Lab VM'}
            </button>
          ) : (
            <>
              <span className="dz-badge dz-badge-neutral font-mono">
                {capturedSet.size}/{flags.length} flags
              </span>
              {ttlLabel && (
                <span className="dz-badge dz-badge-neutral font-mono text-muted">{ttlLabel}</span>
              )}
              <button
                type="button"
                onClick={resetLab}
                disabled={busy !== null}
                className="dz-btn"
              >
                {busy === 'resetting' ? 'Resetting…' : 'Reset VM'}
              </button>
              <button
                type="button"
                onClick={stopLab}
                disabled={busy !== null}
                className="dz-btn text-accent"
              >
                {busy === 'stopping' ? 'Stopping…' : 'Stop VM'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-xs text-accent">
          {error}
        </p>
      )}

      {!lab && !loading && (
        <p className="text-xs leading-relaxed text-muted">
          Spawns an isolated Debian 12 GUI virtual machine (no internet access, private per-student
          flags, auto-login as <code className="font-mono">student</code>). Desktop boots in ~15s;
          open <code className="font-mono">~/README-LAB.txt</code> inside the VM for scenario details.
        </p>
      )}

      {lab && (
        <div className="space-y-4">
          <LabViewer labId={lab.id} mode="rw" defaultView="desktop" />

          <div className="grid gap-4 rounded-lg border border-line bg-panel p-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="dz-label">Scenario Objectives</p>
                <span className="font-mono text-[11px] text-muted">{pct}%</span>
              </div>
              <div className="dz-progress mb-3">
                <span style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-1.5 text-xs">
                {flags.map((f) => {
                  const done = capturedSet.has(f.key);
                  return (
                    <li key={f.key} className="flex items-start gap-2">
                      <span className={done ? 'text-accent-2' : 'text-muted'}>
                        {done ? '✓' : '○'}
                      </span>
                      <span>
                        <span className={done ? 'font-medium text-accent-2 line-through' : 'font-medium'}>
                          {f.label}
                        </span>
                        <span className="block text-muted">{f.hint}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <form onSubmit={submitFlag} className="flex flex-col justify-between gap-2">
              <div>
                <label htmlFor="dz-flag-input" className="dz-label">
                  Submit Flag
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="dz-flag-input"
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="FLAG{...}"
                    className="w-full rounded-md border border-line bg-panel-2 px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
                  />
                  <button type="submit" className="dz-btn dz-btn-primary shrink-0">
                    Verify
                  </button>
                </div>
              </div>
              {flagMsg && (
                <p
                  className={`font-mono text-xs ${flagMsg.ok ? 'text-accent-2' : 'text-accent'}`}
                >
                  {flagMsg.text}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
