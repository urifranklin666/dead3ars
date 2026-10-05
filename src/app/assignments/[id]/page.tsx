import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { WorkSubmission } from '@/components/WorkSubmission';
import { getModule } from '@/lib/curriculum';
import { getRubric, gradeFor, studentAssignment, submissionFor } from '@/lib/classroom';
import { moduleHref } from '@/lib/routes';
import { viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Assignment — dead3ars' };

/* A student's single-assignment workspace: the task, the rubric it is graded
 * against, their submission so far, and the teacher's mark and feedback. */
export default async function StudentAssignmentPage(props: PageProps<'/assignments/[id]'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');

  const assignmentId = Number(id);
  if (!Number.isInteger(assignmentId)) notFound();

  const assignment = studentAssignment(user.id, assignmentId);
  if (!assignment) notFound();

  const mod = getModule(assignment.module_id);
  const rubric = getRubric(assignmentId);
  const submission = submissionFor(assignmentId, user.id);
  const grade = gradeFor(assignmentId, user.id);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const overdue = assignment.due_at !== null && assignment.due_at < now;

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/dashboard" className="hover:text-ink">
          dashboard
        </Link>
        <span className="mx-1.5">/</span>
        <span>assignment</span>
      </nav>

      <header className="space-y-2">
        <p className="dz-label">Assignment</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {mod ? `${String(mod.order).padStart(2, '0')} · ${mod.title}` : assignment.module_id}
        </h1>
        <p className="text-sm text-muted">
          {assignment.due_at ? (
            <span className={overdue && !grade ? 'text-warn' : ''}>
              due {assignment.due_at.slice(0, 10)}
              {overdue && !grade ? ' · past its due date' : ''}
            </span>
          ) : (
            'no due date'
          )}
        </p>
      </header>

      {grade && (
        <section className="dz-card border-accent-2/40 p-5">
          <p className="dz-label">Marked</p>
          <p className="mt-2 font-mono text-2xl font-bold text-accent-2">
            {grade.score}
            <span className="text-base text-muted">/{grade.max}</span>
          </p>
          {grade.feedback && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{grade.feedback}</p>
          )}
          <p className="mt-2 text-xs text-muted">graded {grade.graded_at.slice(0, 10)}</p>
        </section>
      )}

      {rubric.length > 0 && (
        <section className="dz-card p-5">
          <p className="dz-label">
            How this is graded · {rubric.reduce((n, c) => n + c.points, 0)} points
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {rubric.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-xs text-muted">{String(c.points).padStart(2, '0')}</span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  {c.description && <span className="block text-muted">{c.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mod && (
        <section className="dz-card p-5">
          <p className="dz-label">The task</p>
          <div className="mt-2">
            <p className="font-semibold">{mod.lab.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{mod.lab.brief}</p>
            <p className="mt-3 text-sm">
              <Link href={moduleHref(mod.id)} className="text-accent hover:underline">
                Open the full module ({mod.minutes} min) →
              </Link>
            </p>
            <div className="mt-3">
              <p className="dz-label">Success criteria</p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {mod.lab.success.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="dz-card p-5">
        <p className="dz-label">Your submission</p>
        <div className="mt-3">
          <WorkSubmission
            assignmentId={assignmentId}
            initialBody={submission?.body ?? ''}
            initialLink={submission?.link ?? ''}
            submittedAt={submission?.submitted_at ?? null}
          />
        </div>
      </section>
    </div>
  );
}
