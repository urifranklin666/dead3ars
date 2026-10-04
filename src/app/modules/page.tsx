import type { Metadata } from 'next';
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

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="dz-label">Twelve modules</p>
        <h1 className="text-3xl font-bold tracking-tight">Syllabus</h1>
        <p className="max-w-2xl leading-relaxed text-muted">
          Work through them in order. Each module states its own ethics boundary, gives the
          attacker&rsquo;s view and the defender&rsquo;s view of the same technique, and ends
          with a short assessment whose explanations are released only after you submit.
        </p>
        {!user && (
          <p className="text-sm text-muted">
            Modules 1–3 are open. Sign in to unlock the rest and to have your progress recorded.
          </p>
        )}
      </header>

      {tiers.map((tier) => {
        const inTier = modules.filter((m) => m.tier === tier);
        if (inTier.length === 0) return null;

        return (
          <section key={tier} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className={`dz-badge dz-badge-${tier}`}>{tier}</span>
              <p className="text-sm text-muted">{TIER_BLURB[tier]}</p>
            </div>
            <ModuleList modules={inTier} progress={progress} authed={user !== null} />
          </section>
        );
      })}
    </div>
  );
}
