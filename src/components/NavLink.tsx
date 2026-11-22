'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

/* Nav items need the current path to mark the active section. Keeping this in a
 * tiny client leaf means the header itself stays a server component and the
 * session still comes from the cookie on the server. */
export function NavLink({ href, label }: { href: Route; label: string }) {
  const pathname = usePathname();

  const active =
    href === '/modules' || href === '/teacher/classes'
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  return (
    <Link href={href} className="dz-nav-link" aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  );
}
