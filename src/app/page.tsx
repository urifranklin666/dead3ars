import Image from 'next/image';
import Link from 'next/link';
import { ModuleList } from '@/components/ModuleList';
import { curriculumStats, FREE_MODULE_LIMIT, loadModules } from '@/lib/curriculum';
import { viewer } from '@/lib/session';
import { plural } from '@/lib/format';

const TIERS = [
  { tier: 'foundation', blurb: 'Understand authorisation, set up your lab, and get oriented to the threat landscape.' },
  { tier: 'core', blurb: 'Study how common attacks unfold and the controls that can interrupt them.' },
  { tier: 'advanced', blurb: 'Investigate incidents, build detections, and practise writing a security report.' },
] as const;

export default async function Home() {
  const user = await viewer();
  const stats = curriculumStats();
  const modules = loadModules();
  const preview = modules.filter((module) => module.order <= FREE_MODULE_LIMIT);
  const workspace = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : '/dashboard';

  return (
    <div className="course-home">
      <section className="course-hero">
        <div>
          <p className="course-kicker">Hands-on cybersecurity course</p>
          <h1>Learn how attacks work. <span>Build better defenses.</span></h1>
          <p className="course-intro">
            Study offensive security alongside the controls that stop attacks and the
            signals that reveal them. Practise in an isolated lab.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={user ? workspace : '/register'} className="dz-btn dz-btn-primary">
              {user ? 'Open your workspace' : 'Enroll in the course'}
            </Link>
            <Link href="/modules" className="dz-btn">Explore the syllabus</Link>
          </div>
        </div>
        <div className="course-art">
          <Image src="/course-hero.webp" alt="" fill sizes="(min-width: 1024px) 540px, (min-width: 640px) 90vw, 100vw" preload />
        </div>
      </section>

      <dl className="course-stats">
        {[
          { value: stats.modules, label: 'Course modules' },
          { value: stats.labs, label: 'Lab activities' },
          { value: stats.questions, label: 'Assessment questions' },
          { value: stats.techniques, label: 'MITRE ATT&CK techniques' },
        ].map(({ value, label }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="course-section" aria-labelledby="learning-path">
        <div className="course-section-heading">
          <div>
            <p className="course-kicker">Curriculum</p>
            <h2 id="learning-path">Your learning path</h2>
          </div>
          <Link href="/modules" className="dz-link">View the full syllabus</Link>
        </div>
        <div className="course-tracks">
          {TIERS.map(({ tier, blurb }) => {
            const inTier = modules.filter((module) => module.tier === tier);
            if (!inTier.length) return null;
            return (
              <Link key={tier} href={`/modules#${tier}`} className={`dz-card dz-card-hover course-track course-track-${tier}`}>
                <p className="course-track-count">{plural(inTier.length, 'module')}</p>
                <h3>{tier}</h3>
                <p>{blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="course-section" aria-labelledby="start-learning">
        <div className="course-section-heading">
          <div>
            <h2 id="start-learning">Start with the foundations</h2>
            <p className="mt-2 text-muted">The first {FREE_MODULE_LIMIT} modules are open to everyone.</p>
          </div>
        </div>
        <ModuleList modules={preview} authed={user !== null} showTier={false} />
      </section>

      <aside className="course-boundary">
        <h2>Practise with authorisation</h2>
        <p>Use a lab you own or a system whose owner has given you written permission to test.</p>
      </aside>
    </div>
  );
}
