import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findUserById } from '@/lib/db';
import { loadModules } from '@/lib/curriculum';
import { attemptsFor, progressMap, type Status } from '@/lib/progress';
import { classesForStudent } from '@/lib/classroom';
import { classHref, moduleHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent, shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Student — dead3ars' };

const STATUS_LABEL: Record<Status, string> = {
  engaged: 'engaged',
  'lab-complete': 'lab complete',
  'assessment-passed': 'passed',
};

export default async function StudentDetailPage(props: PageProps<'/teacher/students/[id]'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const student = findUserById(studentId);
  if (!student || student.role !== 'student') notFound();

  const modules = loadModules();
  const progress = progressMap(studentId);
  const attempts = attemptsFor(studentId);
  const classes = classesForStudent(studentId);
  const passed = modules.filter((m) => progress[m.id] === 'assessment-passed').length;

  /* Best score per module, for the summary column. */
  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const cur = best.get(a.module_id);
    if (!cur || a.score / a.total > cur.score / cur.total) best.set(a.module_id, { score: a.score, total: a.total });
  }

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/teacher" className="hover:text-ink">
          cohort
        </Link>
        <span className="mx-1.5">/</span>
        <span>{student.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="dz-label">Student</p>
          <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
          <p className="text-sm text-muted">{student.email}</p>
        </div>
        <Link href="/teacher" className="dz-btn">
          Back to cohort
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={passed} label={`of ${modules.length} passed`} />
        <Stat n={Object.keys(progress).length} label="modules started" />
        <Stat n={attempts.length} label="assessment attempts" />
        <Stat n={classes.length} label="classes" />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Enrolled classes</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-muted">This student has not joined a class.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link key={c.id} href={classHref(c.id)} className="dz-btn text-sm">
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Progress by module</h2>
        <div className="dz-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="dz-label px-4 py-3">Module</th>
                <th className="dz-label px-4 py-3">Status</th>
                <th className="dz-label px-4 py-3">Best score</th>
                <th className="dz-label px-4 py-3">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const status = progress[m.id];
                const b = best.get(m.id);
                const count = attempts.filter((a) => a.module_id === m.id).length;
                return (
                  <tr key={m.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={moduleHref(m.id)} className="hover:text-accent">
                        {String(m.order).padStart(2, '0')} · {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span className={status === 'assessment-passed' ? 'text-accent-2' : ''}>
                          {STATUS_LABEL[status]}
                        </span>
                      ) : (
                        <span className="text-muted">not started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {b ? (
                        <span className={b.score / b.total >= 0.7 ? 'text-accent-2' : 'text-warn'}>
                          {b.score}/{b.total}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {attempts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Assessment history</h2>
          <div className="dz-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">Module</th>
                  <th className="dz-label px-4 py-3">Score</th>
                  <th className="dz-label px-4 py-3">Taken</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{a.module_id}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={a.score / a.total >= 0.7 ? 'text-accent-2' : 'text-warn'}>
                        {a.score}/{a.total}
                      </span>
                      <span className="ml-2 text-muted">{percent((a.score / a.total) * 100)}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{shortDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
