import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { classAnalytics, gradebook, ownedClass, roster } from '@/lib/classroom';
import { loadModules } from '@/lib/curriculum';
import { classHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent } from '@/lib/format';

export const metadata: Metadata = { title: 'Class analytics — dead3ars' };

/* Where a class is stuck. For each assigned module: how many have started,
 * passed, the cohort average, and how many are past due without a pass. */
export default async function ClassAnalyticsPage(props: PageProps<'/teacher/classes/[id]/analytics'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const classId = Number(id);
  if (!Number.isInteger(classId)) notFound();

  const klass = ownedClass(user.id, classId);
  if (!klass) notFound();

  const gb = gradebook(classId);
  const analytics = classAnalytics(classId);
  const titles = new Map(loadModules().map((m) => [m.id, m]));
  const enrolled = roster(classId).length;

  const avgPassRate = analytics.length
    ? Math.round((analytics.reduce((n, a) => n + a.passed / Math.max(1, enrolled), 0) / analytics.length) * 100)
    : null;
  const needsAttention = gb.rows
    .map((r) => ({ name: r.student.name, id: r.student.id, overdue: r.overdue.length, average: r.average }))
    .filter((r) => r.overdue > 0);

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/teacher" className="hover:text-ink">
          cohort
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/teacher/classes" className="hover:text-ink">
          classes
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={classHref(classId)} className="hover:text-ink">
          {klass.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span>analytics</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="dz-label">Analytics · {klass.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">Where the class is stuck</h1>
          <p className="text-sm text-muted">
            {enrolled} enrolled · {analytics.length} modules assigned
            {avgPassRate !== null && ` · mean pass rate ${avgPassRate}%`}
          </p>
        </div>
        <Link href={classHref(classId)} className="dz-btn">
          Gradebook
        </Link>
      </header>

      {analytics.length === 0 ? (
        <div className="dz-card p-6 text-sm text-muted">
          Nothing is assigned to this class yet. Assign a module on the class page and its
          numbers will appear here.
        </div>
      ) : (
        <section className="dz-card overflow-x-auto" tabIndex={0} role="group" aria-label="Per-module analytics">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="dz-label px-4 py-3">Module</th>
                <th className="dz-label px-4 py-3 text-right">Started</th>
                <th className="dz-label px-4 py-3 text-right">Passed</th>
                <th className="dz-label px-4 py-3 text-right">Average</th>
                <th className="dz-label px-4 py-3 text-right">Past due</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((a) => {
                const m = titles.get(a.module_id);
                const passRate = enrolled > 0 ? a.passed / enrolled : 0;
                return (
                  <tr key={a.module_id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {m ? `${String(m.order).padStart(2, '0')} · ${m.title}` : a.module_id}
                      </span>
                      <span className="mt-1 block h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-panel-2">
                        <span
                          className="block h-full bg-accent-2"
                          style={{ width: `${Math.round(passRate * 100)}%` }}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{a.started}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={a.passed > 0 ? 'text-accent-2' : 'text-muted'}>{a.passed}</span>
                      <span className="text-muted">/{enrolled}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={a.average !== null && a.average < 70 ? 'text-warn' : ''}>
                        {percent(a.average)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {a.overdue > 0 ? <span className="text-warn">{a.overdue}</span> : <span className="text-muted">0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Students who need attention</h2>
        {needsAttention.length === 0 ? (
          <p className="text-sm text-muted">
            Nobody is past a due date with work outstanding. {gb.rows.length === 0 && 'Nobody has joined yet.'}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {needsAttention.map((s) => (
              <Link
                key={s.id}
                href={`/teacher/students/${s.id}` as never}
                className="dz-card flex items-center justify-between gap-3 p-4 hover:border-warn"
              >
                <span className="font-medium">{s.name}</span>
                <span className="font-mono text-xs">
                  <span className="text-warn">{s.overdue} past due</span>
                  <span className="ml-3 text-muted">avg {percent(s.average)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
