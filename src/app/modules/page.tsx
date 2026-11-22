import type { Metadata } from 'next';
import Link from 'next/link';
import { ModuleList } from '@/components/ModuleList';
import { loadModules } from '@/lib/curriculum';
import { progressMap } from '@/lib/progress';
import { viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Syllabus — dead3ars' };

const TIER_BLURB: Record<'foundation' | 'core' | 'advanced', string> = {
  foundation: 'Legal foundation, lab construction, and the current threat landscape.',
  core: 'The attack chain begins: reconnaissance, hardware, initial access, web applications.',
  advanced: 'Escalation and persistence, then detection, forensics, AI, and the capstone.',
};

export default async function ModulesPage() {
  const user = await viewer();
  const modules = loadModules();
  const progress = user ? progressMap(user.id) : {};

  const tiers = ['foundation', 'core', 'advanced'] as const;
  const minutes = modules.reduce((n, m) => n + m.minutes, 0);

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="course-kicker">
          {modules.length} modules · {minutes} minutes
        </p>
        <h1 className="text-5xl font-bold tracking-[-0.055em] sm:text-6xl">Syllabus</h1>
        <p className="max-w-2xl leading-relaxed text-muted">
          Work through them in order. Each module states its own ethics boundary, gives the
          attacker&rsquo;s view and the defender&rsquo;s view of the same technique, and ends
          with a short assessment whose explanations are released only after you submit.
        </p>
        {!user ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Modules 1–3 are open.{' '}
            <Link href="/register" className="dz-link">
              Enroll
            </Link>{' '}
            or{' '}
            <Link href="/login" className="dz-link">
              sign in
            </Link>{' '}
            to unlock the rest and have your progress recorded.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {Object.keys(progress).length} of {modules.length} modules started.
          </p>
        )}
      </header>

      <p className="rounded-xl border border-line bg-panel px-4 py-3 text-sm leading-relaxed text-muted">
        Codes like <span className="font-mono text-ink">T1059</span> are technique IDs in
        MITRE ATT&amp;CK, a catalog of attacker behaviors. Use them to look up what a technique
        means and how defenders can detect or mitigate it.{' '}
        <a href="https://attack.mitre.org/techniques/T1059/" className="dz-link">
          See an example on MITRE ATT&amp;CK
        </a>.
      </p>

      <nav
        className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel/60 p-2"
        aria-label="Tiers"
      >
        {tiers.map((tier) => {
          const inTier = modules.filter((m) => m.tier === tier).length;
          return (
            <a
              key={tier}
              href={`#${tier}`}
              className={`dz-badge dz-badge-${tier} px-3 py-1.5`}
            >
              {tier} · {inTier}
            </a>
          );
        })}
      </nav>

      {tiers.map((tier) => {
        const inTier = modules.filter((m) => m.tier === tier);
        if (inTier.length === 0) return null;

        return (
          <section key={tier} id={tier} className="scroll-mt-24 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`dz-badge dz-badge-${tier}`}>{tier}</span>
              <p className="text-sm text-muted">{TIER_BLURB[tier]}</p>
            </div>
            <ModuleList modules={inTier} progress={progress} authed={user !== null} showTier={false} />
          </section>
        );
      })}
    </div>
  );
}
