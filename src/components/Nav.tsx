import Link from 'next/link';
import type { Route } from 'next';
import type { SessionUser } from '@/lib/auth';
import { SignOutButton } from './SignOutButton';
import { NavLink } from './NavLink';

interface NavItem {
  href: Route;
  label: string;
}

export function Nav({ user }: { user: SessionUser | null }) {
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';

  const items: NavItem[] = [
    { href: '/modules', label: 'Syllabus' },
    ...(isStudent
      ? [
          { href: '/dashboard' as Route, label: 'Dashboard' },
          { href: '/notes' as Route, label: 'Notes' },
        ]
      : []),
    ...(isTeacher
      ? [
          { href: '/teacher' as Route, label: 'Cohort' },
          { href: '/teacher/classes' as Route, label: 'Classes' },
        ]
      : []),
    ...(isAdmin ? [{ href: '/admin' as Route, label: 'Admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <div className="flex h-16 items-center gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg border border-accent/40 bg-accent/10 font-mono text-[12px] font-bold text-accent shadow-[0_0_20px_-6px_#ff3b4e] transition-colors group-hover:border-accent"
            >
              d3
            </span>
            <span className="font-mono text-[15px] font-bold tracking-tight">
              dead<span className="text-accent">3ars</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5 text-sm">
            {user ? (
              <>
                <span className="hidden items-center gap-2 text-muted sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-panel-2 font-mono text-[11px] font-bold text-ink">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-[12rem] truncate">{user.name}</span>
                  {user.role !== 'student' && (
                    <span className="dz-badge dz-badge-neutral">{user.role}</span>
                  )}
                </span>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="dz-btn text-sm">
                  Sign in
                </Link>
                <Link href="/register" className="dz-btn dz-btn-primary text-sm">
                  Enroll
                </Link>
              </>
            )}
          </div>
        </div>

        <nav
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-2.5 md:hidden"
          aria-label="Main (compact)"
        >
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </div>
    </header>
  );
}
