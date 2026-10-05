import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { Notes } from '@/components/Notes';
import { ProgressControls } from '@/components/ProgressControls';
import { Quiz } from '@/components/Quiz';
import { TierBadge } from '@/components/TierBadge';
import { FREE_MODULE_LIMIT, getModule, loadModules } from '@/lib/curriculum';
import { publicModule } from '@/lib/api';
import { getNote, progressMap } from '@/lib/progress';
import { workForStudent } from '@/lib/classroom';
import { moduleHref } from '@/lib/routes';
import { viewer } from '@/lib/session';

export function generateStaticParams() {
  return loadModules().map((m) => ({ id: m.id }));
}

export async function generateMetadata(
  props: PageProps<'/modules/[id]'>,
): Promise<Metadata> {
  const { id } = await props.params;
  const mod = getModule(id);
  return { title: mod ? `${mod.title} — dead3ars` : 'Module — dead3ars' };
}

export default async function ModulePage(props: PageProps<'/modules/[id]'>) {
  /* params must be awaited before any synchronous access — see the dynamic-routes
   * guide: reading it first is a prerender error under Cache Components. */
  const { id } = await props.params;

  const user = await viewer();
  const mod = getModule(id);
  if (!mod) notFound();

  const modules = loadModules();
  const index = modules.findIndex((m) => m.id === mod.id);
  const locked = !user && index >= FREE_MODULE_LIMIT;

  const progress = user ? progressMap(user.id) : {};
  const note = user ? getNote(user.id, mod.id) : '';
  /* Any class assignment that names this module, for the signed-in student. */
  const myWork = user ? workForStudent(user.id, mod.id) : [];

  /* The answer key is stripped server-side, so it is never in the HTML or the
   * client bundle. Signed-in students still only get the questions. */
  const safe = publicModule(mod);

  const prev = modules[index - 1];
  const next = modules[index + 1];

  return (
    <article className="space-y-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/modules" className="hover:text-ink">
          syllabus
        </Link>
        <span className="mx-1.5">/</span>
        <span>{mod.id}</span>
      </nav>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={mod.tier} />
          <span className="dz-badge dz-badge-neutral">{mod.minutes} min</span>
          {progress[mod.id] && (
            <span className="dz-badge dz-badge-neutral">in progress</span>
          )}
        </div>

        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {mod.title}
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted">{mod.summary}</p>

        <div className="flex flex-wrap gap-2 font-mono text-xs">
          {mod.mitre.map((t) => (
            <span key={t} className="rounded border border-line bg-panel-2 px-2 py-0.5">
              {t}
            </span>
          ))}
          {mod.owasp.map((o) => (
            <span key={o} className="rounded border border-accent/40 px-2 py-0.5 text-accent">
              {o}
            </span>
          ))}
          {mod.cwe.map((c) => (
            <span key={c} className="rounded border border-line px-2 py-0.5 text-muted">
              {c}
            </span>
          ))}
        </div>
      </header>

      {locked ? (
        <section className="dz-card space-y-3 p-6">
          <p className="dz-label">Locked</p>
          <p className="leading-relaxed">
            This module is beyond the open preview. Enrol or sign in to read it, run its lab,
            and have your progress recorded.
          </p>
          <div className="flex gap-3 pt-1">
            <Link href="/register" className="dz-btn dz-btn-primary">
              Enrol
            </Link>
            <Link href="/login" className="dz-btn">
              Sign in
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="dz-card p-5">
            <p className="dz-label">Objectives</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
              {mod.objectives.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>

          {mod.sections['scenario'] && (
            <Section title="Scenario">
              <Markdown>{mod.sections['scenario']}</Markdown>
            </Section>
          )}

          {mod.sections["attacker's view"] && (
            <Section title="Attacker's view" tone="danger">
              <Markdown>{mod.sections["attacker's view"]}</Markdown>
            </Section>
          )}

          {mod.sections["defender's view"] && (
            <Section title="Defender's view" tone="accent-2">
              <Markdown>{mod.sections["defender's view"]}</Markdown>
            </Section>
          )}

          {mod.sections['key concepts'] && (
            <Section title="Key concepts">
              <Markdown>{mod.sections['key concepts']}</Markdown>
            </Section>
          )}

          <Section id="lab" title="Lab" tone="accent">
            <p className="dz-label">
              {mod.lab.environment} environment
            </p>
            <p className="mt-2 font-semibold">{mod.lab.name}</p>
            <p className="mt-2 leading-relaxed text-sm text-muted">{mod.lab.brief}</p>

            <ol className="mt-4 space-y-3">
              {mod.lab.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block leading-relaxed">{step.do}</span>
                    {step.expect && (
                      <span className="mt-1 block leading-relaxed text-muted">
                        <span className="dz-label">Expected · </span>
                        {step.expect}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <p className="dz-label">Success criteria</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {mod.lab.success.map((s) => (
                    <li key={s}>· {s}</li>
                  ))}
                </ul>
              </div>
              {mod.lab.cleanup.length > 0 && (
                <div>
                  <p className="dz-label">Cleanup</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {mod.lab.cleanup.map((c) => (
                      <li key={c}>· {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          <Section id="ethics" title="Ethics and legality" tone="warn">
            <dl className="space-y-4 text-sm leading-relaxed">
              <div>
                <dt className="dz-label">Boundary</dt>
                <dd className="mt-1">{mod.ethics.boundary}</dd>
              </div>
              <div>
                <dt className="dz-label">The law</dt>
                <dd className="mt-1">{mod.ethics.legal}</dd>
              </div>
              {mod.ethics.disclosure && (
                <div>
                  <dt className="dz-label">Disclosure</dt>
                  <dd className="mt-1">{mod.ethics.disclosure}</dd>
                </div>
              )}
              {mod.ethics.notes && (
                <div>
                  <dt className="dz-label">Note</dt>
                  <dd className="mt-1">{mod.ethics.notes}</dd>
                </div>
              )}
            </dl>
          </Section>

          <Section id="defenses" title="Defensive controls" tone="accent-2">
            <ul className="space-y-2 text-sm leading-relaxed">
              {mod.defenses.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-accent-2">✓</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>

          {myWork.length > 0 && (
            <Section id="classwork" title="Assigned work" tone="accent">
              <p className="mb-3 text-sm text-muted">
                A teacher set this module for your class. Submit your write-up on the
                assignment page; the module reading and assessment stay here.
              </p>
              <ul className="space-y-2">
                {myWork.map((w) => (
                  <li key={w.assignment_id}>
                    <Link
                      href={`/assignments/${w.assignment_id}` as never}
                      className="dz-card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-accent"
                    >
                      <span>
                        <span className="block font-medium">{w.class_name}</span>
                        <span className="block text-xs text-muted">
                          {w.due_at ? `due ${w.due_at.slice(0, 10)}` : 'no due date'}
                        </span>
                      </span>
                      <span className="font-mono text-xs">
                        {w.graded_at !== null ? (
                          <span className="text-accent-2">
                            marked {w.score}/{w.max}
                          </span>
                        ) : w.submitted_at !== null ? (
                          <span className="text-accent">submitted</span>
                        ) : (
                          <span className="text-muted">not submitted</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {user && (
            <Section id="notes" title="Your notes">
              <Notes moduleId={mod.id} initialBody={note} />
            </Section>
          )}

          <Section id="assessment" title="Assessment" tone="warn">
            <p className="mb-4 text-sm text-muted">
              Graded on the server; the answer key is never sent to your browser. You need
              70% to pass.
            </p>
            <Quiz
              moduleId={mod.id}
              questions={safe.assessment}
              signedIn={user !== null}
            />
          </Section>

          <section className="dz-card p-5">
            <p className="dz-label">Progress</p>
            <div className="mt-3">
              <ProgressControls
                moduleId={mod.id}
                initialStatus={progress[mod.id] ?? null}
                signedIn={user !== null}
              />
            </div>
          </section>
        </>
      )}

      <nav className="flex flex-wrap items-stretch gap-3 border-t border-line pt-6">
        {prev ? (
          <Link href={moduleHref(prev.id)} className="dz-card flex-1 p-4 hover:border-accent">
            <span className="dz-label">← Previous</span>
            <span className="mt-1 block font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link href={moduleHref(next.id)} className="dz-card flex-1 p-4 text-right hover:border-accent">
            <span className="dz-label">Next →</span>
            <span className="mt-1 block font-medium">{next.title}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </article>
  );
}

const TONE_BORDER: Record<string, string> = {
  danger: 'border-danger/40',
  'accent-2': 'border-accent-2/40',
  accent: 'border-accent/40',
  warn: 'border-warn/40',
  default: 'border-line',
};

function Section({
  title,
  tone = 'default',
  id,
  children,
}: {
  title: string;
  tone?: keyof typeof TONE_BORDER;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`dz-card scroll-mt-20 p-5 ${TONE_BORDER[tone]}`}>
      <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}
