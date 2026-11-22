import Image from 'next/image';
import Link from 'next/link';
import { IncidentPreview } from '@/components/IncidentPreview';
import { ModuleList } from '@/components/ModuleList';
import { curriculumStats, FREE_MODULE_LIMIT, loadModules } from '@/lib/curriculum';
import { listScenarios } from '@/lib/labs';
import { viewer } from '@/lib/session';
import { plural } from '@/lib/format';

const TIERS = [
  { tier: 'foundation', blurb: 'Understand authorisation, verify lab isolation, and get oriented to the modern threat landscape.' },
  { tier: 'core', blurb: 'Hands-on web, API, network packet, recon, and blue-team detection scenarios in live VMs.' },
  { tier: 'advanced', blurb: 'Linux privesc, cloud/container escapes, AI/LLM attacks, binary triage, ransomware IR, and capstone.' },
] as const;

const PILLARS = [
  {
    kicker: 'Air-Gapped KVM Range',
    title: 'Real Linux GUI VMs in your browser',
    body: 'Every student boots a private, zero-egress Debian 12 desktop in seconds with per-student dynamic flags and one-click snapshot rollback.',
  },
  {
    kicker: 'Attack and Defense',
    title: 'Every attack paired with its defense',
    body: 'Each module teaches attacker mechanics alongside detection engineering, root-cause controls, and the legal boundary that governs the work.',
  },
  {
    kicker: 'Live Instructor Console',
    title: 'Shadow, assist, and grade in real time',
    body: 'Supervise an entire cohort from a live screen wall, toggle interactive assist when a student stalls, and sync lab flags straight to the gradebook.',
  },
] as const;

export default async function Home() {
  const user = await viewer();
  const stats = curriculumStats();
  const modules = loadModules();
  const scenarioCount = listScenarios().length;
  const preview = modules.filter((module) => module.order <= FREE_MODULE_LIMIT);
  const workspace = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : '/dashboard';

  return (
    <div className="course-home">
      <section className="course-hero">
        <div>
          <p className="course-kicker">Blackwire Cyber Range · Invite-Only Academy</p>
          <h1>Learn how attacks work. <span>Build better defenses.</span></h1>
          <p className="course-intro">
            Study offensive security alongside the controls that stop attacks and the
            signals that reveal them — inside live, isolated KVM virtual machines streamed
            straight to your browser.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={user ? workspace : '/register'} className="dz-btn dz-btn-primary">
              {user ? 'Open your workspace' : 'Enroll with invite code'}
            </Link>
            <a href="#incident-preview" className="dz-btn course-demo-link">Try the incident preview</a>
            {!user && (
              <a
                href="mailto:hello@deadplug.digital?subject=Blackwire%20Invite%20%2F%20Instructor%20Pilot%20Request"
                className="dz-btn"
              >
                Request invite
              </a>
            )}
          </div>
        </div>
        <div className="course-art">
          <span className="course-art-scan" aria-hidden="true" />
          <Image src="/course-hero.webp" alt="" fill sizes="(min-width: 1024px) 540px, (min-width: 640px) 90vw, 100vw" preload />
        </div>
      </section>

      <dl className="course-stats">
        {[
          { value: stats.modules, label: 'Course modules' },
          { value: scenarioCount, label: 'Live KVM scenarios' },
          { value: stats.questions, label: 'Assessment questions' },
          { value: stats.techniques, label: 'MITRE ATT&CK techniques' },
        ].map(({ value, label }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <IncidentPreview />

      <section className="course-section grid gap-4 md:grid-cols-3" aria-label="Platform capabilities">
        {PILLARS.map((p) => (
          <div key={p.title} className="dz-card space-y-2 p-5">
            <p className="dz-label text-accent">{p.kicker}</p>
            <h2 className="text-base font-semibold tracking-tight">{p.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </section>

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
            <p className="mt-2 text-muted">The first {FREE_MODULE_LIMIT} modules are open to preview.</p>
          </div>
        </div>
        <ModuleList modules={preview} authed={user !== null} showTier={false} />
      </section>

      <aside className="course-boundary">
        <h2>Practise with authorisation</h2>
        <p>Every Blackwire lab runs in an air-gapped KVM sandbox. Never run offensive techniques against systems without written permission.</p>
      </aside>
    </div>
  );
}
