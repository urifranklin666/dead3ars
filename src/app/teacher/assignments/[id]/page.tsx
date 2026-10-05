import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { GradeForm } from '@/components/GradeForm';
import { RubricEditor } from '@/components/RubricEditor';
import { assignmentWork, classById, getRubric, ownedAssignment } from '@/lib/classroom';
import { getModule } from '@/lib/curriculum';
import { moduleHref, studentHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { percent } from '@/lib/format';

export const metadata: Metadata = { title: 'Grade assignment — dead3ars' };

export default async function AssignmentGradingPage(props: PageProps<'/teacher/assignments/[id]'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const assignmentId = Number(id);
  if (!Number.isInteger(assignmentId)) notFound();

  const assignment = ownedAssignment(user.id, assignmentId);
  if (!assignment) notFound();

  const klass = classById(assignment.class_id)!;
  const mod = getModule(assignment.module_id);
  const rubric = getRubric(assignmentId);
  const work = assignmentWork(assignmentId);

  const rubricMax = rubric.reduce((n, c) => n + c.points, 0);
  const defaultMax = rubricMax > 0 ? rubricMax : 100;

  const submitted = work.filter((w) => w.submission).length;
  const graded = work.filter((w) => w.grade).length;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const overdue = assignment.due_at !== null && assignment.due_at < now;

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/teacher/classes" className="hover:text-ink">
          classes
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/teacher/classes/${klass.id}` as never} className="hover:text-ink">
          {klass.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{assignment.module_id}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="dz-label">
            {klass.name} · grading
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {mod ? `${String(mod.order).padStart(2, '0')} · ${mod.title}` : assignment.module_id}
          </h1>
          <p className="text-sm text-muted">
            {submitted} of {work.length} submitted · {graded} graded
            {assignment.due_at && (
              <>
                {' · '}
                <span className={overdue ? 'text-warn' : ''}>
                  due {assignment.due_at.slice(0, 10)}
                  {overdue ? ' · past' : ''}
                </span>
              </>
            )}
            {!assignment.due_at && ' · no due date'}
          </p>
        </div>
        <div className="flex gap-3">
          {mod && (
            <Link href={moduleHref(mod.id)} className="dz-btn">
              Open module
            </Link>
          )}
          <Link href={`/teacher/classes/${klass.id}` as never} className="dz-btn">
            Back to class
          </Link>
        </div>
      </header>

      <section className="dz-card p-5">
        <RubricEditor assignmentId={assignmentId} initial={rubric} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Submissions</h2>
        {work.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">Nobody has joined this class yet.</div>
        ) : (
          <div className="space-y-3">
            {work.map((w) => (
              <div key={w.student.id} className="dz-card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={studentHref(w.student.id)} className="font-medium hover:text-accent">
                      {w.student.name}
                    </Link>
                    <span className="block text-xs text-muted">{w.student.email}</span>
                  </div>
                  <div className="text-right">
                    {w.submission ? (
                      <span className="block text-xs text-muted">
                        submitted {w.submission.submitted_at.slice(0, 16).replace('T', ' ')} UTC
                        {w.submission.updated_at !== w.submission.submitted_at && ' · edited'}
                      </span>
                    ) : (
                      <span className="block text-xs text-warn">not submitted</span>
                    )}
                    {w.grade && (
                      <span className="block font-mono text-sm text-accent-2">
                        {percent((w.grade.score / w.grade.max) * 100)}
                      </span>
                    )}
                  </div>
                </div>

                {w.submission ? (
                  <div className="space-y-2 border-t border-line pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{w.submission.body}</p>
                    {w.submission.link && (
                      <a
                        href={w.submission.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block break-all font-mono text-xs text-accent hover:underline"
                      >
                        {w.submission.link}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="border-t border-line pt-3 text-sm text-muted">
                    This student has not submitted anything yet.
                  </p>
                )}

                <div className="border-t border-line pt-3">
                  <GradeForm
                    assignmentId={assignmentId}
                    studentId={w.student.id}
                    max={defaultMax}
                    /* A plain object: node:sqlite rows have a null prototype and
                     * cannot cross the server/client boundary. */
                    initial={
                      w.grade
                        ? {
                            score: w.grade.score,
                            max: w.grade.max,
                            feedback: w.grade.feedback,
                            graded_at: w.grade.graded_at,
                          }
                        : null
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
