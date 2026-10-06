import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { DiscussionThread } from '@/components/DiscussionThread';
import {
  canSeeClass,
  classById,
  listAnnouncements,
  listAssignments,
  listDiscussion,
  workForStudent,
} from '@/lib/classroom';
import { loadModules } from '@/lib/curriculum';
import { viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Class — dead3ars' };

/* A student's view of one class they belong to: what is assigned, what the
 * teacher has announced, and the class discussion. Only members get in. */
export default async function StudentClassPage(props: PageProps<'/classes/[id]'>) {
  const { id } = await props.params;

  const user = await viewer();
  if (!user) redirect('/login');

  const classId = Number(id);
  if (!Number.isInteger(classId)) notFound();

  if (!canSeeClass(user.id, user.role, classId)) notFound();

  const klass = classById(classId)!;
  const modules = new Map(loadModules().map((m) => [m.id, m]));
  const assigned = listAssignments(classId);
  const myWork = new Map(workForStudent(user.id).filter((w) => w.class_id === classId).map((w) => [w.assignment_id, w]));
  const announcements = listAnnouncements(classId);
  const threads = listDiscussion(classId);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return (
    <div className="space-y-10">
      <nav className="font-mono text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-ink">
          dashboard
        </Link>
        <span className="mx-1.5">/</span>
        <span>{klass.name}</span>
      </nav>

      <header className="space-y-2">
        <p className="dz-label">Class</p>
        <h1 className="text-3xl font-bold tracking-tight">{klass.name}</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Assigned work</h2>
        {assigned.length === 0 ? (
          <p className="text-sm text-muted">Nothing assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assigned.map((a) => {
              const mod = modules.get(a.module_id);
              const mine = myWork.get(a.id);
              const overdue = a.due_at !== null && a.due_at < now && !mine?.graded_at;
              return (
                <Link
                  key={a.id}
                  href={`/assignments/${a.id}` as never}
                  className="dz-card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-accent"
                >
                  <span>
                    <span className="block font-medium">
                      {mod ? `${String(mod.order).padStart(2, '0')} · ${mod.title}` : a.module_id}
                    </span>
                    <span className="block text-xs text-muted">
                      {a.due_at ? (
                        <span className={overdue ? 'text-warn' : ''}>
                          due {a.due_at.slice(0, 10)}
                          {overdue ? ' · overdue' : ''}
                        </span>
                      ) : (
                        'no due date'
                      )}
                    </span>
                  </span>
                  <span className="font-mono text-xs">
                    {mine?.graded_at ? (
                      <span className="text-accent-2">
                        marked {mine.score}/{mine.max}
                      </span>
                    ) : mine?.submitted_at ? (
                      <span className="text-accent">submitted</span>
                    ) : (
                      <span className="text-muted">not submitted</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted">No announcements from your teacher yet.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <article key={a.id} className="dz-card p-4">
                {a.title && <p className="font-medium">{a.title}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {a.author_name} · {a.created_at.slice(0, 16).replace('T', ' ')} UTC
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Class discussion</h2>
        <DiscussionThread classId={classId} threads={threads} meId={user.id} canModerate={false} />
      </section>
    </div>
  );
}
