import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { curriculumStats, loadModules } from '@/lib/curriculum';
import { cohort, type CohortRow } from '@/lib/progress';
import { moduleHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent, shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Cohort — dead3ars' };

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

  /* Where the cohort stalls is a curriculum signal, not just a student one. */
  const startedByModule = modules.map((m) => ({
    mod: m,
    started: rows.filter((r) => r.modules_started >= m.order).length,
    passed: rows.filter((r) => r.assessments_passed >= m.order).length,
  }));

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="dz-label">Teacher · {user.name}</p>
        <h1 className="text-3xl font-bold tracking-tight">Cohort</h1>
        <p className="text-sm text-muted">
          {stats.modules} modules · {stats.questions} assessment questions ·{' '}
          {stats.techniques} ATT&amp;CK techniques in the curriculum.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={rows.length} label="students" />
        <Stat n={rows.filter((r) => r.last_active).length} label="active" />
        <Stat n={classAverage === null ? '—' : `${classAverage}%`} label="class average" />
        <Stat n={rows.filter((r) => r.assessments_passed >= modules.length).length} label="finished" />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Progress by student</h2>
        {rows.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">
            No student accounts yet. Run <code className="font-mono">npm run seed</code> to
            create a demo cohort, or have students enrol.
          </div>
        ) : (
          <div className="dz-card overflow-x-auto">
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
        <h2 className="text-xl font-semibold">Where the cohort is</h2>
        <div className="space-y-2">
          {startedByModule.map(({ mod, started, passed }) => {
            const pct = rows.length ? Math.round((started / rows.length) * 100) : 0;
            return (
              <Link
                key={mod.id}
                href={moduleHref(mod.id)}
                className="dz-card block p-4 hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">
                    {String(mod.order).padStart(2, '0')} · {mod.title}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {started}/{rows.length} started · {passed} passed
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
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
        <span className="block font-medium">{row.name}</span>
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
