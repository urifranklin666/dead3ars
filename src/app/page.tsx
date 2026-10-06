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
    <div className="space-y-14">
      <section className="space-y-5 pt-4">
        <p className="dz-label">Security education · lab-contained</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Learn how attacks work.
          <br />
          <span className="text-accent">Then learn why that means learning defence.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          A twelve-module course in modern offensive technique, built the way a professional
          curriculum is built: every attack is paired with the control that stops it, the
          detection that catches it, and the law that governs it. All practical work happens
          inside an isolated lab you own.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {user ? (
            <Link href="/dashboard" className="dz-btn dz-btn-primary">
              Go to your dashboard
            </Link>
          ) : (
            <Link href="/register" className="dz-btn dz-btn-primary">
              Enrol
            </Link>
          )}
          <Link href="/modules" className="dz-btn">
            Browse the syllabus
          </Link>
          <span className="text-sm text-muted">
            The first three modules are readable without an account.
          </span>
        </div>
      </section>

      <section className="dz-card border-warn/40 bg-warn/5 p-5">
        <p className="dz-label text-warn">Rules of the road</p>
        <p className="mt-2 text-sm leading-relaxed">
          Everything in this course is either legal or a felony, and the only thing that
          separates them is <strong>authorisation</strong>. You may practise against a lab
          machine you own, or a system you have written permission to test. Nothing else.
          Each module states the boundary explicitly, and the first module is dedicated to
          it.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { n: stats.modules, label: 'modules' },
          { n: stats.minutes, label: 'minutes of coursework' },
          { n: stats.questions, label: 'assessment questions' },
          { n: stats.techniques, label: 'ATT&CK techniques' },
        ].map((s) => (
          <div key={s.label} className="dz-card p-4">
            <p className="font-mono text-3xl font-bold text-accent">{s.n}</p>
            <p className="dz-label mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">How it is structured</h2>
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
              <div key={tier} className="dz-card p-4">
                <p className={`dz-badge dz-badge-${tier}`}>{tier}</p>
                <p className="mt-2 text-sm text-muted">{blurb}</p>
                <p className="mt-3 font-mono text-xs text-muted">
                  {plural(inTier.length, 'module')} ·{' '}
                  {inTier.reduce((n, m) => n + m.minutes, 0)} min
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">The curriculum</h2>
          <Link href="/modules" className="text-sm dz-link">
            Full syllabus →
          </Link>
        </div>
        <ModuleList modules={modules} authed={user !== null} />
      </section>
    </div>
  );
}
