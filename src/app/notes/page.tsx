import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { loadModules } from '@/lib/curriculum';
import { getNote, progressMap } from '@/lib/progress';
import { moduleHref } from '@/lib/routes';
import { viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Notes — Blackwire' };

export default async function NotesPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');
  if (user.role === 'teacher') redirect('/teacher');

  const modules = loadModules();
  const progress = progressMap(user.id);

  const withNotes = modules
    .map((m) => ({ mod: m, body: getNote(user.id, m.id) }))
    .filter((n) => n.body.trim().length > 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="dz-label">Private to you · {withNotes.length} with notes</p>
        <h1 className="text-3xl font-bold tracking-tight">Study notes</h1>
        <p className="max-w-2xl leading-relaxed text-muted">
          Everything you have written against a module, in course order. Notes are kept
          server-side against your account and are never visible to other students.
        </p>
      </header>

      {withNotes.length === 0 ? (
        <div className="dz-empty">
          No notes yet. Open any module and write in the{' '}
          <Link href="/modules" className="dz-link">
            notes box
          </Link>{' '}
          at the bottom of the page.
        </div>
      ) : (
        <div className="space-y-5">
          {withNotes.map(({ mod, body }) => (
            <section key={mod.id} className="dz-card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={moduleHref(mod.id)}
                  className="font-semibold tracking-tight hover:text-accent"
                >
                  {String(mod.order).padStart(2, '0')} · {mod.title}
                </Link>
                <span className="dz-badge dz-badge-neutral">
                  {progress[mod.id] ?? 'not started'}
                </span>
              </div>
              <div className="mt-4 border-t border-line pt-4">
                <Markdown>{body}</Markdown>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Notes are stored against your account and shown only to you.
      </p>
    </div>
  );
}
