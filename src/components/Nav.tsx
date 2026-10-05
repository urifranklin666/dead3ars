import Link from 'next/link';
import type { SessionUser } from '@/lib/auth';
import { isAdmin, isStaff } from '@/lib/session';
import { SignOutButton } from './SignOutButton';

export function Nav({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-5">
        <Link href="/" className="font-mono text-[15px] font-bold tracking-tight">
          dead<span className="text-accent">3ars</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/modules" className="hover:text-ink">
            Syllabus
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-ink">
              Dashboard
            </Link>
          )}
          {user && (
            <Link href="/notes" className="hover:text-ink">
              Notes
            </Link>
          )}
          {isStaff(user) && (
            <>
              <Link href="/teacher" className="hover:text-ink">
                Cohort
              </Link>
              <Link href="/teacher/classes" className="hover:text-ink">
                Classes
              </Link>
            </>
          )}
          {isAdmin(user) && (
            <Link href="/admin" className="hover:text-ink">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-muted sm:inline">
                {user.name}
                {isStaff(user) && <span className="dz-badge dz-badge-neutral ml-2">{user.role}</span>}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="dz-btn">
                Sign in
              </Link>
              <Link href="/register" className="dz-btn dz-btn-primary">
                Enrol
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
