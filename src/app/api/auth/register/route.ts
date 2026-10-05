import { cookies } from 'next/headers';
import { z } from 'zod';
import { createUser } from '@/lib/auth';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db';
import { audit, clientIp } from '@/lib/audit';
import { fail, ok, SESSION_COOKIE_OPTS } from '@/lib/api';

const Body = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
  role: z.enum(['student', 'teacher']).default('student'),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail('Check the form: a name, a valid email, and a password of at least 8 characters.');
  }
  const { email, name, password, role } = parsed.data;

  if (findUserByEmail(email)) return fail('That email is already registered.');

  try {
    const user = createUser({ email, name, password, role });
    const { token } = createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
    audit({ actorId: user.id, actorEmail: user.email, action: 'auth.register', detail: role, ip: clientIp(req) });
    return ok({ user });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'could not create the account', 500);
  }
}
