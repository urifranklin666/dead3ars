import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AssignForm } from '@/components/AssignForm';
import { ClassCodePanel } from '@/components/ClassCodePanel';
import { RemoveAssignmentButton } from '@/components/RemoveAssignmentButton';
import { gradebook, listAssignments, ownedClass, roster } from '@/lib/classroom';
import { loadModules } from '@/lib/curriculum';
import { studentHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent } from '@/lib/format';

export const metadata: Metadata = { title: 'Class — dead3ars' };

export default async function ClassDetailPage(props: PageProps<'/teacher/classes/[id]'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const classId = Number(id);
  if (!Number.isInteger(classId)) notFound();

  const klass = user ? ownedClass(user.id, classId) : undefined;
  if (!klass) notFound();

  const modules = loadModules();
  const titles = new Map(modules.map((m) => [m.id, m]));
  const assignments = listAssignments(classId);
  const assignedIds = new Set(assignments.map((a) => a.module_id));
  const assignable = modules
    .filter((m) => !assignedIds.has(m.id))
    .map((m) => ({ id: m.id, title: m.title, order: m.order }));

  const gb = gradebook(classId);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Roster members who have not yet joined — enrolled but no progress on any assignment.
  const atRisk = gb.rows.filter((r) => r.overdue.length > 0);
  const inactive = roster(classId).filter(
    (s) => !gb.rows.find((r) => r.student.id === s.id)?.lastActive,
  );

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/teacher" className="hover:text-ink">
          cohort
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/teacher/classes" className="hover:text-ink">
          classes
        </Link>
        <span className="mx-1.5">/</span>
        <span>{klass.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="dz-label">Class</p>
          <h1 className="text-3xl font-bold tracking-tight">{klass.name}</h1>
          <p className="text-sm text-muted">
            {roster(classId).length} enrolled · {assignments.length} assigned
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/classes/${classId}/export`} className="dz-btn">
            Export CSV
          </a>
          <Link href="/teacher/classes" className="dz-btn">
            All classes
          </Link>
        </div>
      </header>

      <ClassCodePanel classId={classId} code={klass.join_code} redirectAfterDelete="/teacher/classes" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Assignments</h2>
        <div className="dz-card space-y-4 p-5">
          <AssignForm classId={classId} assignable={assignable} canRotate />
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-muted">Nothing assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const mod = titles.get(a.module_id);
              const overdue = a.due_at !== null && a.due_at < now;
              return (
                <div key={a.id} className="dz-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link href={`/modules/${a.module_id}`} className="font-medium hover:text-accent">
                      {mod ? `${String(mod.order).padStart(2, '0')} · ${mod.title}` : a.module_id}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {a.due_at ? (
                        <span className={overdue ? 'text-warn' : ''}>
                          due {a.due_at.slice(0, 10)}
                          {overdue ? ' · past' : ''}
                        </span>
                      ) : (
                        'no due date'
                      )}
                    </p>
                  </div>
                  <RemoveAssignmentButton classId={classId} moduleId={a.module_id} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {atRisk.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Needs attention</h2>
          <p className="text-sm text-muted">
            Students with an assigned module past its due date and not yet passed.
          </p>
          <div className="flex flex-wrap gap-2">
            {atRisk.map((r) => (
              <Link key={r.student.id} href={studentHref(r.student.id)} className="dz-btn text-sm border-warn/50 text-warn">
                {r.student.name} · {r.overdue.length}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Gradebook</h2>
          <span className="dz-label">
            {gb.modules.length} {gb.modules.length === 1 ? 'module' : 'modules'} assigned
          </span>
        </div>

        {gb.rows.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">
            Nobody has joined yet. Share the join code above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label sticky left-0 bg-bg px-3 py-3">Student</th>
                  {gb.modules.map((id) => {
                    const m = titles.get(id);
                    return (
                      <th key={id} className="dz-label px-3 py-3 text-center" title={m?.title ?? id}>
                        {m ? String(m.order).padStart(2, '0') : id}
                      </th>
                    );
                  })}
                  <th className="dz-label px-3 py-3 text-center">Passed</th>
                  <th className="dz-label px-3 py-3 text-center">Avg</th>
                </tr>
              </thead>
              <tbody>
                {gb.rows.map((row) => (
                  <tr key={row.student.id} className="border-b border-line/60 last:border-0">
                    <td className="sticky left-0 bg-bg px-3 py-3">
                      <Link href={studentHref(row.student.id)} className="font-medium hover:text-accent">
                        {row.student.name}
                      </Link>
                      <span className="block text-xs text-muted">{row.student.email}</span>
                    </td>
                    {gb.modules.map((id) => (
                      <td key={id} className="px-3 py-3 text-center font-mono">
                        <Cell cell={row.cells[id]} />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-mono">
                      {row.passed}
                      <span className="text-muted">/{gb.modules.length}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      <span className={row.average !== null && row.average >= 70 ? 'text-accent-2' : row.average !== null ? 'text-warn' : 'text-muted'}>
                        {percent(row.average)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {inactive.length > 0 && (
          <p className="text-xs text-muted">
            {inactive.length} {inactive.length === 1 ? 'student has' : 'students have'} not opened any
            module yet: {inactive.map((s) => s.name).join(', ')}.
          </p>
        )}
      </section>
    </div>
  );
}

function Cell({ cell }: { cell: { status: string | null; score: number | null; total: number | null } | undefined }) {
  if (!cell || cell.status === null) return <span className="text-muted">·</span>;
  if (cell.status === 'assessment-passed')
    return <span className="text-accent-2" title={cell.score === null ? 'passed' : `${cell.score}/${cell.total}`}>✓</span>;
  if (cell.status === 'lab-complete') return <span className="text-accent" title="lab complete">◐</span>;
  return <span className="text-muted" title="engaged">○</span>;
}
