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
  const isStaff = isTeacher || isAdmin;

  const items: NavItem[] = [
    { href: '/modules', label: 'Syllabus' },
    ...(isStudent
      ? [
          { href: '/dashboard' as Route, label: 'Dashboard' },
          { href: '/notes' as Route, label: 'Notes' },
        ]
      : []),
    ...(isStaff
      ? [
          { href: '/teacher' as Route, label: 'Cohort' },
          { href: '/teacher/labs' as Route, label: 'Live Labs' },
          { href: '/teacher/classes' as Route, label: 'Classes' },
          { href: '/teacher/solutions' as Route, label: 'Solutions' },
        ]
      : []),
    ...(isAdmin ? [{ href: '/admin' as Route, label: 'Admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
        <div className="flex min-h-16 items-center gap-2 sm:gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-md bg-accent font-mono text-xs font-extrabold tracking-tighter text-bg shadow-[0_0_24px_-6px_#ff3b4e] transition group-hover:scale-105"
            >
              BW
            </span>
            <span className="font-mono text-base font-bold uppercase tracking-[0.14em] sm:text-lg">
              BLACK<span className="text-accent">WIRE</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 text-sm sm:gap-2.5">
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
                <Link href="/login" className="dz-btn px-2.5! text-sm sm:px-4!">
                  Sign in
                </Link>
                <Link href="/register" className="dz-btn dz-btn-primary px-2.5! text-sm sm:px-4!">
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
