import Link from 'next/link';
import { ModuleList } from '@/components/ModuleList';
import { curriculumStats, loadModules } from '@/lib/curriculum';
import { viewer } from '@/lib/session';
import { plural } from '@/lib/format';

const TIERS = [
  {
    tier: 'foundation' as const,
    blurb: 'Law, lab hygiene, and the threat model you are working against.',
  },
  {
    tier: 'core' as const,
    blurb: 'Reconnaissance, hardware, initial access, and web application attacks.',
  },
  {
    tier: 'advanced' as const,
    blurb: 'Escalation, detection engineering, forensics, AI attack surface, capstone.',
  },
];

export default async function Home() {
  const user = await viewer();
  const stats = curriculumStats();
  const modules = loadModules();

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div className="space-y-6">
          <p className="dz-label flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_#ff3b4e]" />
            Security education · lab-contained
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Learn how attacks work.
            <br />
            <span className="bg-gradient-to-r from-accent via-[#ff7a86] to-[#ffb1b8] bg-clip-text text-transparent">
              Then learn why that means learning defense.
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            A twelve-module course in modern offensive technique, built the way a professional
            curriculum is built: every attack is paired with the control that stops it, the
            detection that catches it, and the law that governs it. All practical work happens
            inside an isolated lab you own.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {user ? (
              <Link href="/dashboard" className="dz-btn dz-btn-primary">
                Go to your dashboard
              </Link>
            ) : (
              <Link href="/register" className="dz-btn dz-btn-primary">
                Enroll
              </Link>
            )}
            <Link href="/modules" className="dz-btn">
              Browse the syllabus
            </Link>
            <span className="text-sm text-muted">
              The first three modules are readable without an account.
            </span>
          </div>
        </div>

        <aside className="dz-card dz-card-accent overflow-hidden" aria-label="Course snapshot">
          <div className="flex items-center justify-between border-b border-line/80 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-accent/80" />
              <span className="h-2 w-2 rounded-full bg-warn/70" />
              <span className="h-2 w-2 rounded-full bg-accent-2/60" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              curriculum.snapshot
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line/60">
            {[
              { n: stats.modules, label: 'modules' },
              { n: stats.minutes, label: 'minutes' },
              { n: stats.questions, label: 'questions' },
              { n: stats.techniques, label: 'ATT&CK techniques' },
            ].map((s) => (
              <div key={s.label} className="bg-panel px-4 py-5">
                <p className="font-mono text-3xl font-bold text-accent">{s.n}</p>
                <p className="dz-label mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="dz-label">Tier path</span>
              <span className="font-mono text-[11px] text-muted">01 → 12</span>
            </div>
            <div className="flex gap-1" aria-hidden>
              <span className="h-1.5 flex-1 rounded-full bg-accent-2/70" />
              <span className="h-1.5 flex-[2] rounded-full bg-accent/80" />
              <span className="h-1.5 flex-[2] rounded-full bg-warn/70" />
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Foundation → core → advanced. Every module ends with a server-graded assessment.
            </p>
          </div>
        </aside>
      </section>

      <section className="dz-card border-warn/30 p-5 sm:p-6">
        <p className="dz-label text-warn">Rules of the road</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Everything in this course is either legal or a felony, and the only thing that
          separates them is <strong className="text-ink">authorisation</strong>. You may practise
          against a lab machine you own, or a system you have written permission to test. Nothing
          else. Each module states the boundary explicitly, and the first module is dedicated to
          it.
        </p>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="dz-section-title">How it is structured</h2>
          <span className="dz-label">{plural(stats.modules, 'module')} · {plural(stats.labs, 'lab')}</span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          The course follows the order an intrusion actually happens in — then reverses the
          camera. Modules 1–3 give you the legal and technical foundation and the current
          threat picture. Modules 4–8 walk the attack chain, from reconnaissance to
          persistence. Modules 9–12 are the part most curricula skip: detection engineering,
          forensics, the new AI attack surface, and a full engagement you plan, run, and
          report yourself.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map(({ tier, blurb }) => {
            const inTier = modules.filter((m) => m.tier === tier);
            return (
              <div key={tier} className="dz-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className={`dz-badge dz-badge-${tier}`}>{tier}</p>
                  <span className="font-mono text-[11px] text-muted">
                    {String(inTier.length).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{blurb}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {plural(inTier.length, 'module')} ·{' '}
                  {inTier.reduce((n, m) => n + m.minutes, 0)} min
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="dz-section-title">The curriculum</h2>
          <Link href="/modules" className="text-sm dz-link">
            Full syllabus →
          </Link>
        </div>
        <ModuleList modules={modules} authed={user !== null} />
      </section>
    </div>
  );
}
