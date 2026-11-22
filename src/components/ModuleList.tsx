import Link from 'next/link';
import type { CourseModule } from '@/lib/curriculum';
import { FREE_MODULE_LIMIT } from '@/lib/curriculum';
import type { Status } from '@/lib/progress';
import { moduleHref } from '@/lib/routes';
import { plural } from '@/lib/format';
import { TierBadge } from './TierBadge';

const STATUS_LABEL: Record<Status, string> = {
  engaged: 'reading',
  'lab-complete': 'lab complete',
  'assessment-passed': 'passed',
};

const STATUS_TONE: Record<Status, string> = {
  engaged: 'text-accent',
  'lab-complete': 'text-warn',
  'assessment-passed': 'text-accent-2',
};

export function ModuleList({
  modules,
  progress = {},
  authed = false,
  showTier = true,
}: {
  modules: CourseModule[];
  progress?: Record<string, Status>;
  authed?: boolean;
  showTier?: boolean;
}) {
  return (
    <ol className="space-y-2.5">
      {modules.map((m) => {
        /* Locking is a property of the module's place in the whole curriculum,
         * not its index inside whatever tier list happens to be rendered. */
        const locked = !authed && m.order > FREE_MODULE_LIMIT;
        const status = progress[m.id];

        return (
          <li key={m.id}>
            <Link
              href={moduleHref(m.id)}
              className={`dz-card dz-card-hover flex items-start gap-4 p-4 sm:p-5 ${
                locked ? 'opacity-85' : ''
              }`}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 font-mono text-xs text-accent">
                {String(m.order).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tracking-tight">{m.title}</span>
                  {showTier && <TierBadge tier={m.tier} />}
                  {status && (
                    <span className={`dz-badge dz-badge-neutral ${STATUS_TONE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  )}
                  {locked && (
                    <span className="dz-badge dz-badge-neutral" title="Sign in to unlock">
                      locked
                    </span>
                  )}
                </span>

                <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-muted">
                  {m.summary}
                </span>

                <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  <span>{m.minutes} min</span>
                  <span aria-hidden>·</span>
                  <span>{plural(m.assessment.length, 'question')}</span>
                  {m.mitre.length > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{m.mitre.slice(0, 4).join(' ')}</span>
                    </>
                  )}
                </span>
              </span>

            </Link>
          </li>
        );
      })}
    </ol>
  );
}
