import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE } from '@/lib/auth';
import { ok, SESSION_COOKIE_OPTS } from '@/lib/api';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  jar.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTS, maxAge: 0 });
  return ok({ signedOut: true });
}
