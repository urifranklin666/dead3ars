import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE, userForToken } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { ok, SESSION_COOKIE_OPTS } from '@/lib/api';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = userForToken(token);
    destroySession(token);
    if (user) audit({ actorId: user.id, actorEmail: user.email, action: 'auth.logout' });
  }
  jar.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTS, maxAge: 0 });
  return ok({ signedOut: true });
}
