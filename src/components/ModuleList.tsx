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
    <ol className="space-y-2">
      {modules.map((m, i) => {
        const locked = !authed && i >= FREE_MODULE_LIMIT;
        const status = progress[m.id];

        return (
          <li key={m.id}>
            <Link
              href={moduleHref(m.id)}
              className="dz-card flex items-start gap-4 p-4 transition-colors hover:border-accent"
            >
              <span className="pt-0.5 font-mono text-sm text-muted">
                {String(m.order).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{m.title}</span>
                  {showTier && <TierBadge tier={m.tier} />}
                  {status && <span className="dz-badge dz-badge-neutral">{STATUS_LABEL[status]}</span>}
                  {locked && <span className="dz-badge dz-badge-neutral">sign in</span>}
                </span>

                <span className="mt-1 line-clamp-2 block text-sm text-muted">{m.summary}</span>

                <span className="mt-2 block font-mono text-xs text-muted">
                  {m.minutes} min · {plural(m.assessment.length, 'question')}
                  {m.mitre.length > 0 && ` · ${m.mitre.slice(0, 4).join(' ')}`}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
