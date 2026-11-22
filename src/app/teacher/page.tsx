import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { curriculumStats, loadModules } from '@/lib/curriculum';
import { cohort, cohortModuleStats, type CohortRow } from '@/lib/progress';
import { moduleHref, studentHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent, shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Cohort — Blackwire' };

export default async function TeacherPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const stats = curriculumStats();
  const rows = cohort();
  const modules = loadModules();

  const classAverage =
    rows.filter((r) => r.quiz_average !== null).length > 0
      ? Math.round(
          rows
            .filter((r) => r.quiz_average !== null)
            .reduce((n, r) => n + (r.quiz_average ?? 0), 0) /
            rows.filter((r) => r.quiz_average !== null).length,
        )
      : null;

  /* Where the cohort stalls is a curriculum signal, not just a student one.
   * Counts come from the progress rows themselves, so a student who jumped
   * straight to module 7 still counts as having started module 7. */
  const moduleStats = new Map(cohortModuleStats().map((s) => [s.module_id, s]));
  const startedByModule = modules.map((m) => ({
    mod: m,
    started: moduleStats.get(m.id)?.started ?? 0,
    passed: moduleStats.get(m.id)?.passed ?? 0,
  }));

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
            <p className="dz-label">Teacher console · {user.name}</p>
            <h1 className="text-3xl font-bold tracking-tight">Cohort</h1>
            <p className="text-sm text-muted">
              {stats.modules} modules · {stats.questions} assessment questions ·{' '}
              {stats.techniques} ATT&amp;CK techniques in the curriculum.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/labs" className="dz-btn dz-btn-primary">
            Live Labs
          </Link>
          <Link href="/teacher/solutions" className="dz-btn">
            Solutions &amp; Key
          </Link>
          <Link
            href={user.role === 'admin' ? '/admin' : '/teacher/classes'}
            className="dz-btn"
          >
            {user.role === 'admin' ? 'Admin console' : 'Classes & assignments'}
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={rows.length} label="students" />
        <Stat n={rows.filter((r) => r.last_active).length} label="active" />
        <Stat n={classAverage === null ? '—' : `${classAverage}%`} label="class average" />
        <Stat n={rows.filter((r) => r.assessments_passed >= modules.length).length} label="finished" />
      </section>

      <section className="space-y-4">
        <h2 className="dz-section-title">Progress by student</h2>
        {rows.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">
            No student accounts yet. Run <code className="font-mono">npm run seed</code> to
            create a demo cohort, or have students enroll.
          </div>
        ) : (
          <div className="dz-card overflow-x-auto" tabIndex={0} role="group" aria-label="Students">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">Student</th>
                  <th className="dz-label px-4 py-3">Started</th>
                  <th className="dz-label px-4 py-3">Labs</th>
                  <th className="dz-label px-4 py-3">Passed</th>
                  <th className="dz-label px-4 py-3">Quiz avg</th>
                  <th className="dz-label px-4 py-3">Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <CohortTr key={r.id} row={r} total={modules.length} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="dz-section-title">Where the cohort is</h2>
        <div className="space-y-2">
          {startedByModule.map(({ mod, started, passed }) => {
            const pct = rows.length ? Math.round((started / rows.length) * 100) : 0;
            return (
              <Link
                key={mod.id}
                href={moduleHref(mod.id)}
                className="dz-card dz-card-hover block p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-medium">
                    {String(mod.order).padStart(2, '0')} · {mod.title}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {started}/{rows.length} started · <span className="text-accent-2">{passed} passed</span>
                  </span>
                </div>
                <div className="dz-progress mt-2.5">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          A module where many students start and few pass is usually a module whose lab needs
          clarifying, not a cohort that needs pushing.
        </p>
      </section>
    </div>
  );
}

function CohortTr({ row, total }: { row: CohortRow; total: number }) {
  const done = row.assessments_passed >= total;
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-4 py-3">
        <Link href={studentHref(row.id)} className="block font-medium hover:text-accent">
          {row.name}
        </Link>
        <span className="block text-xs text-muted">{row.email}</span>
      </td>
      <td className="px-4 py-3 font-mono">{row.modules_started}</td>
      <td className="px-4 py-3 font-mono">{row.labs_complete}</td>
      <td className="px-4 py-3 font-mono">
        <span className={done ? 'text-accent-2' : ''}>{row.assessments_passed}</span>
        <span className="text-muted">/{total}</span>
      </td>
      <td className="px-4 py-3 font-mono">
        {row.quiz_average === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={row.quiz_average >= 70 ? 'text-accent-2' : 'text-warn'}>
            {percent(row.quiz_average)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted">{shortDate(row.last_active)}</td>
    </tr>
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
