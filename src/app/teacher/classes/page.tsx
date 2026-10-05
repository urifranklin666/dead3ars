import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CreateClassForm } from '@/components/CreateClassForm';
import { classesForTeacher } from '@/lib/classroom';
import { classHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';
import { shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Classes — dead3ars' };

export default async function ClassesPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const classes = classesForTeacher(user.id);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="dz-label">Teacher · {user.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="max-w-2xl leading-relaxed text-muted">
            A class is a roster you enrol students into with a join code. Assign modules to a
            class to put them on every member&rsquo;s dashboard, with a due date if you like.
          </p>
        </div>
        <Link href="/teacher" className="dz-btn">
          Cohort overview
        </Link>
      </header>

      <CreateClassForm />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your classes</h2>
        {classes.length === 0 ? (
          <div className="dz-card p-6 text-sm text-muted">
            No classes yet. Create one above, then hand its join code to your students.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((c) => (
              <Link key={c.id} href={classHref(c.id)} className="dz-card block p-5 hover:border-accent">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono text-xs text-accent">{c.join_code}</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {c.students} {c.students === 1 ? 'student' : 'students'} · {c.assignments}{' '}
                  {c.assignments === 1 ? 'assignment' : 'assignments'}
                </p>
                <p className="mt-1 text-xs text-muted">created {shortDate(c.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
