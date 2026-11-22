import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ModuleList } from '@/components/ModuleList';
import { JoinClassForm } from '@/components/JoinClassForm';
import { loadModules } from '@/lib/curriculum';
import { bestAttempt, getNote, progressMap, type Status } from '@/lib/progress';
import { classesForStudent, workForStudent } from '@/lib/classroom';
import { assignmentHref, moduleHref, studentClassHref } from '@/lib/routes';
import { viewer } from '@/lib/session';
import { percent, shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Dashboard — Blackwire' };

export default async function DashboardPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');
  if (user.role === 'teacher') redirect('/teacher');

  const modules = loadModules();
  const progress = progressMap(user.id);

  const byStatus = (s: Status) => modules.filter((m) => progress[m.id] === s).length;
  const complete = byStatus('assessment-passed');
  const pct = modules.length ? Math.round((complete / modules.length) * 100) : 0;

  const graded = modules
    .map((m) => ({ mod: m, attempt: bestAttempt(user.id, m.id) }))
    .filter((r): r is { mod: typeof r.mod; attempt: NonNullable<typeof r.attempt> } => r.attempt !== undefined);

  const average =
    graded.length > 0
      ? Math.round(
          (graded.reduce((n, r) => n + r.attempt.score / r.attempt.total, 0) / graded.length) * 100,
        )
      : null;

  /* The next thing to do: the first module not yet passed. */
  const nextUp = modules.find((m) => progress[m.id] !== 'assessment-passed');

  const notes = modules
    .map((m) => ({ mod: m, body: getNote(user.id, m.id) }))
    .filter((n) => n.body.trim().length > 0);

  /* Work a teacher set, and the classes this student belongs to. */
  const assigned = workForStudent(user.id);
  const titles = new Map(modules.map((m) => [m.id, m]));
  const myClasses = classesForStudent(user.id);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const ungraded = assigned.filter((a) => a.submitted_at !== null && a.graded_at === null).length;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="grid h-14 w-14 place-items-center rounded-2xl border border-accent/30 bg-accent/10 font-mono text-xl font-bold text-accent shadow-[0_0_30px_-10px_#a1bfff]"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="space-y-1">
            <p className="dz-label">Student console</p>
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/notes" className="dz-btn">
            All notes
          </Link>
          <Link href="/modules" className="dz-btn dz-btn-primary">
            Syllabus
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={`${pct}%`} label="course complete" />
        <Stat n={complete} label={`of ${modules.length} modules passed`} />
        <Stat n={byStatus('lab-complete')} label="labs awaiting assessment" />
        <Stat n={average === null ? '—' : `${average}%`} label="average quiz score" />
      </section>

      <section className="dz-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="dz-label">Course progress</span>
          <span className="font-mono text-sm font-semibold text-accent">{pct}%</span>
        </div>
        <div className="mt-3 dz-progress" role="img" aria-label={`${pct}% of the course complete`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {complete} passed · {byStatus('lab-complete')} labs awaiting assessment ·{' '}
          {Math.max(0, modules.length - complete)} remaining
        </p>
      </section>

      {nextUp && (
        <section className="dz-card dz-card-accent space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="dz-label text-accent">Next up</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {String(nextUp.order).padStart(2, '0')} · {nextUp.title}
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{nextUp.summary}</p>
            </div>
            <span className="dz-badge dz-badge-neutral">{nextUp.minutes} min</span>
          </div>
          <Link href={moduleHref(nextUp.id)} className="dz-btn dz-btn-primary">
            Continue
          </Link>
        </section>
      )}

      {assigned.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="dz-section-title">Assigned to you</h2>
            <span className="dz-label">
              {assigned.length} from your classes
              {ungraded > 0 && ` · ${ungraded} awaiting a mark`}
            </span>
          </div>
          <div className="space-y-2">
            {assigned.map((a) => {
              const mod = titles.get(a.module_id);
              const overdue = a.due_at !== null && a.due_at < now && a.graded_at === null;
              const state =
                a.graded_at !== null ? (
                  <span className="text-accent-2">✓ marked {a.score}/{a.max}</span>
                ) : a.submitted_at !== null ? (
                  <span className="text-accent">submitted · awaiting a mark</span>
                ) : a.status === 'assessment-passed' ? (
                  <span className="text-accent-2">✓ module passed</span>
                ) : (
                  <span className="text-muted">not submitted</span>
                );
              return (
                <Link
                  key={a.assignment_id}
                  href={assignmentHref(a.assignment_id)}
                  className="dz-card dz-card-hover flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <span className="font-medium">
                      {mod ? `${String(mod.order).padStart(2, '0')} · ${mod.title}` : a.module_id}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {a.class_name} ·{' '}
                      {a.due_at ? (
                        <span className={overdue ? 'text-warn' : ''}>
                          due {a.due_at.slice(0, 10)}
                          {overdue ? ' · overdue' : ''}
                        </span>
                      ) : (
                        'no due date'
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-xs">{state}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="dz-card space-y-4 p-5">
        {myClasses.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="dz-label">Your classes</span>
              {myClasses.map((c) => (
                <Link
                  key={c.id}
                  href={studentClassHref(c.id)}
                  className="dz-badge dz-badge-neutral hover:text-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted">
              Enrolled with {myClasses.map((c) => c.teacher_name).join(', ')}. Ask your teacher for a
              new join code to add another class.
            </p>
          </>
        ) : (
          <p className="dz-label">Your classes</p>
        )}
        <JoinClassForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="dz-section-title">Your syllabus</h2>
          <span className="dz-label">{modules.filter((m) => progress[m.id]).length} started</span>
        </div>
        <ModuleList modules={modules} progress={progress} authed />
      </section>

      {graded.length > 0 && (
        <section className="space-y-4">
          <h2 className="dz-section-title">Assessment history</h2>
          <div className="dz-card overflow-x-auto" tabIndex={0} role="group" aria-label="Assessment history">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">Module</th>
                  <th className="dz-label px-4 py-3">Best score</th>
                  <th className="dz-label px-4 py-3">Taken</th>
                </tr>
              </thead>
              <tbody>
                {graded.map(({ mod, attempt }) => {
                  const ratio = attempt.score / attempt.total;
                  return (
                    <tr key={mod.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={moduleHref(mod.id)} className="hover:text-accent">
                          {String(mod.order).padStart(2, '0')} · {mod.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={ratio >= 0.7 ? 'text-accent-2' : 'text-warn'}>
                          {attempt.score}/{attempt.total}
                        </span>
                        <span className="ml-2 text-muted">{percent(ratio * 100)}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">{shortDate(attempt.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="dz-section-title">Study notes</h2>
          <Link href="/notes" className="dz-link text-sm">
            All notes →
          </Link>
        </div>
        {notes.length === 0 ? (
          <div className="dz-empty">
            Notes you write against a module appear here. They are private to you.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.map(({ mod, body }) => (
              <Link
                key={mod.id}
                href={moduleHref(mod.id)}
                className="dz-card dz-card-hover block p-4"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {String(mod.order).padStart(2, '0')} · {mod.title}
                  </span>
                  <span className="font-mono text-[11px] text-muted">{mod.minutes} min</span>
                </span>
                <span className="mt-2 line-clamp-3 block whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {body}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <div className="dz-card p-4">
      <p className="font-mono text-2xl font-bold text-accent">{n}</p>
      <p className="dz-label mt-1">{label}</p>
    </div>
  );
}
