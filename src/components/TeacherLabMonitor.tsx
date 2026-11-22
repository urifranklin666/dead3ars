'use client';

import { useCallback, useEffect, useState } from 'react';
import { LabViewer } from './LabViewer';

interface LiveLab {
  labId: string;
  userId: number;
  studentName: string;
  studentEmail: string;
  moduleId: string;
  status: string;
  paused: boolean;
  rssMb: number;
  ramMb: number;
  vcpus: number;
  startedAt: string;
  expiresAt: string;
  idleSeconds: number;
  ttyClients: number;
  vncClients: number;
  teacherWatchers: number;
  vncReady: boolean;
  captured: string[];
  totalFlags: number;
}

interface LabEvent {
  id: number;
  lab_id: string;
  module_id: string;
  event_type: string;
  detail: string;
  created_at: string;
  actor_name: string;
}

interface ClassRow {
  id: number;
  name: string;
  join_code: string;
  student_count: number;
}

interface ScenarioItem {
  moduleId: string;
  title: string;
}

interface Snapshot {
  labs: LiveLab[];
  maxLabs: number;
  guiImageReady: boolean;
  totalRssMb: number;
  events: LabEvent[];
  classes: ClassRow[];
  scenarios: ScenarioItem[];
}

export function TeacherLabMonitor() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<LiveLab | null>(null);
  const [assistMode, setAssistMode] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'wall'>('table');
  const [busy, setBusy] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ labId: string; studentName: string; text: string } | null>(null);

  const [classId, setClassId] = useState<string>('');
  const [moduleId, setModuleId] = useState<string>('m08-privesc-persistence');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/labs', { cache: 'no-store' });
      const data = (await res.json()) as Snapshot & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to fetch live labs');
      setSnap(data);
      setError('');
      setClassId((cur) => cur || (data.classes[0] ? String(data.classes[0].id) : ''));
      setSelected((cur) => (cur ? data.labs.find((l) => l.labId === cur.labId) ?? null : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load lab telemetry');
    }
  }, []);

  useEffect(() => {
    const init = setTimeout(() => {
      void load();
    }, 0);
    const id = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      clearTimeout(init);
      clearInterval(id);
    };
  }, [load]);

  const stopOne = async (labId: string) => {
    setBusy(labId);
    try {
      await fetch(`/api/labs/${labId}`, { method: 'DELETE' });
      if (selected?.labId === labId) setSelected(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const resetOne = async (labId: string) => {
    setBusy(labId);
    try {
      await fetch(`/api/labs/${labId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const togglePauseOne = async (lab: LiveLab) => {
    setBusy(lab.labId);
    try {
      await fetch(`/api/labs/${lab.labId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: lab.paused ? 'resume' : 'pause' }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const openTranscript = async (lab: LiveLab) => {
    setBusy(`tr-${lab.labId}`);
    try {
      const res = await fetch(`/api/labs/${lab.labId}`);
      const data = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load transcript');
      // Strip ANSI escape codes for clean readability
      const clean = (data.transcript || '(empty transcript)').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
      setTranscript({ labId: lab.labId, studentName: lab.studentName, text: clean });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcript load failed');
    } finally {
      setBusy(null);
    }
  };

  const pauseOrResumeAll = async (pause: boolean) => {
    setBusy('all');
    try {
      const res = await fetch('/api/teacher/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pause ? 'pause-all' : 'resume-all' }),
      });
      const data = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');
      setNotice(`${pause ? 'Paused' : 'Resumed'} ${data.count ?? 0} VM(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBusy(null);
    }
  };

  const launchForClass = async () => {
    if (!classId || !moduleId) return;
    setBusy('class-launch');
    setNotice('');
    setError('');
    try {
      const res = await fetch('/api/teacher/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'class-launch', classId: Number(classId), moduleId }),
      });
      const data = (await res.json()) as { launched?: number; errors?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Class launch failed');
      setNotice(
        `Launched ${data.launched ?? 0} VM(s) for ${moduleId}.` +
          (data.errors?.length ? ` (${data.errors.length} failed)` : ''),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Class launch failed');
    } finally {
      setBusy(null);
    }
  };

  const killAll = async () => {
    if (!confirm('Terminate ALL active student lab VMs?')) return;
    setBusy('all');
    try {
      await fetch('/api/teacher/labs', { method: 'DELETE' });
      setSelected(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="dz-card p-4">
          <p className="font-mono text-2xl font-bold">
            {snap ? `${snap.labs.length}/${snap.maxLabs}` : '—'}
          </p>
          <p className="dz-label mt-1">active VMs</p>
        </div>
        <div className="dz-card p-4">
          <p className="font-mono text-2xl font-bold">
            {snap ? `${snap.totalRssMb} MiB` : '—'}
          </p>
          <p className="dz-label mt-1">host RAM used</p>
        </div>
        <div className="dz-card p-4">
          <p className="font-mono text-2xl font-bold">
            {snap ? (snap.guiImageReady ? 'Ready' : 'Baking…') : '—'}
          </p>
          <p className="dz-label mt-1">GUI base image</p>
        </div>
        <div className="dz-card flex flex-wrap items-center gap-2 p-4">
          <button
            type="button"
            onClick={() => pauseOrResumeAll(true)}
            disabled={!snap || snap.labs.length === 0 || busy === 'all'}
            className="dz-btn py-1 text-xs"
          >
            Pause All
          </button>
          <button
            type="button"
            onClick={() => pauseOrResumeAll(false)}
            disabled={!snap || snap.labs.length === 0 || busy === 'all'}
            className="dz-btn py-1 text-xs"
          >
            Resume All
          </button>
          <button
            type="button"
            onClick={killAll}
            disabled={!snap || snap.labs.length === 0 || busy === 'all'}
            className="dz-btn py-1 text-xs text-accent"
          >
            Stop All
          </button>
        </div>
      </section>

      {snap && snap.classes.length > 0 && (
        <section className="dz-card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[180px] flex-1">
            <label className="dz-label block">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-1.5 text-sm text-ink"
            >
              {snap.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.student_count} students)
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="dz-label block">Scenario</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-1.5 font-mono text-xs text-ink"
            >
              {snap.scenarios.map((s) => (
                <option key={s.moduleId} value={s.moduleId}>
                  {s.moduleId} — {s.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={launchForClass}
            disabled={busy === 'class-launch'}
            className="dz-btn dz-btn-primary"
          >
            {busy === 'class-launch' ? 'Launching…' : 'Launch for Class'}
          </button>
        </section>
      )}

      {notice && (
        <div className="rounded-lg border border-accent-2/40 bg-accent-2/10 p-3 font-mono text-xs text-accent-2">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 font-mono text-xs text-accent">
          {error}
        </div>
      )}

      {selected && (
        <section className="dz-card space-y-3 border-accent/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="dz-label text-accent">
                Live Screen Shadow · {selected.studentName} ({selected.moduleId})
              </p>
              <p className="font-mono text-xs text-muted">
                {selected.labId} · {selected.captured.length}/{selected.totalFlags} flags ·{' '}
                {selected.rssMb} MiB RAM · {selected.paused ? 'PAUSED' : 'RUNNING'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAssistMode((v) => !v)}
                className={assistMode ? 'dz-btn dz-btn-primary' : 'dz-btn'}
              >
                {assistMode ? 'Assist Mode: ON (Interactive)' : 'Observe (Read-Only) — Click to Assist'}
              </button>
              <button
                type="button"
                onClick={() => togglePauseOne(selected)}
                disabled={busy === selected.labId}
                className="dz-btn"
              >
                {selected.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => resetOne(selected.labId)}
                disabled={busy === selected.labId}
                className="dz-btn"
              >
                Reset VM
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setAssistMode(false);
                }}
                className="dz-btn"
              >
                Close
              </button>
            </div>
          </div>

          <LabViewer
            key={`${selected.labId}-${assistMode ? 'rw' : 'ro'}`}
            labId={selected.labId}
            mode={assistMode ? 'rw' : 'ro'}
            defaultView="desktop"
            heightClass="h-[600px]"
          />
        </section>
      )}

      {transcript && (
        <section className="dz-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="dz-label">
              Session Transcript · {transcript.studentName} ({transcript.labId})
            </p>
            <button type="button" onClick={() => setTranscript(null)} className="dz-btn py-1 text-xs">
              Close
            </button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg border border-line bg-[#090b0f] p-3 font-mono text-xs text-muted">
            {transcript.text}
          </pre>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="dz-section-title">Active Student VMs</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`dz-btn py-1 text-xs ${viewMode === 'table' ? 'dz-btn-primary' : ''}`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wall')}
              className={`dz-btn py-1 text-xs ${viewMode === 'wall' ? 'dz-btn-primary' : ''}`}
            >
              Live Screen Wall
            </button>
          </div>
        </div>

        {!snap || snap.labs.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">
            No student lab VMs are currently running. When a student launches a lab from a module
            page, it will appear here within 5 seconds.
          </div>
        ) : viewMode === 'wall' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {snap.labs.map((l) => (
              <div key={l.labId} className="dz-card space-y-2 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-medium">{l.studentName}</span>{' '}
                    <span className="font-mono text-muted">· {l.moduleId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-accent-2">
                      {l.captured.length}/{l.totalFlags}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAssistMode(false);
                        setSelected(l);
                      }}
                      className="dz-btn py-0.5 text-[11px]"
                    >
                      Focus
                    </button>
                  </div>
                </div>
                <LabViewer labId={l.labId} mode="ro" defaultView="desktop" heightClass="h-[260px]" compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="dz-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">Student</th>
                  <th className="dz-label px-4 py-3">Module</th>
                  <th className="dz-label px-4 py-3">State</th>
                  <th className="dz-label px-4 py-3">Flags</th>
                  <th className="dz-label px-4 py-3">Resources</th>
                  <th className="dz-label px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snap.labs.map((l) => (
                  <tr key={l.labId} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-medium">{l.studentName}</span>
                      <span className="block text-xs text-muted">{l.studentEmail}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{l.moduleId}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className={l.paused ? 'text-warn' : 'text-accent-2'}>
                        {l.paused ? 'paused' : 'running'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className={l.captured.length >= l.totalFlags && l.totalFlags > 0 ? 'text-accent-2' : ''}>
                        {l.captured.length}/{l.totalFlags}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {l.rssMb} MiB · {l.vcpus} vCPU
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAssistMode(false);
                            setSelected(l);
                          }}
                          className="dz-btn dz-btn-primary py-1 text-xs"
                        >
                          Watch
                        </button>
                        <button
                          type="button"
                          onClick={() => openTranscript(l)}
                          disabled={busy === `tr-${l.labId}`}
                          className="dz-btn py-1 text-xs"
                        >
                          Transcript
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePauseOne(l)}
                          disabled={busy === l.labId}
                          className="dz-btn py-1 text-xs"
                        >
                          {l.paused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          onClick={() => resetOne(l.labId)}
                          disabled={busy === l.labId}
                          className="dz-btn py-1 text-xs"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => stopOne(l.labId)}
                          disabled={busy === l.labId}
                          className="dz-btn py-1 text-xs text-accent"
                        >
                          Stop
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="dz-section-title">Live Telemetry Feed</h2>
        <div className="dz-card divide-y divide-line/60">
          {!snap || snap.events.length === 0 ? (
            <p className="p-5 text-sm text-muted">No lab events recorded yet.</p>
          ) : (
            snap.events.map((ev) => (
              <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[11px]">
                    {ev.event_type}
                  </span>
                  <span className="font-medium">{ev.actor_name}</span>
                  <span className="font-mono text-muted">{ev.module_id}</span>
                  {ev.detail && <span className="text-muted">— {ev.detail}</span>}
                </div>
                <span className="font-mono text-[11px] text-muted">{ev.created_at}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
