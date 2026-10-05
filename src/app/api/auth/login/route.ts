import { cookies } from 'next/headers';
import { z } from 'zod';
import { createSession, SESSION_COOKIE, verifyPassword } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db';
import { audit, clientIp } from '@/lib/audit';
import { loginLimit, noteLoginFailure, noteLoginSuccess } from '@/lib/ratelimit';
import { fail, ok, SESSION_COOKIE_OPTS } from '@/lib/api';

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Enter your email and password.');

  const { email, password } = parsed.data;
  const ip = clientIp(req);

  /* Checked before the password is verified, so a throttled attempt costs no
   * scrypt work. Two dimensions — see src/lib/ratelimit.ts. */
  const limit = loginLimit({ email, ip });
  if (!limit.allowed) {
    audit({
      actorEmail: email.slice(0, 200),
      action: 'auth.login_throttled',
      detail: limit.scope ?? 'account',
      ip,
    });
    const wait = limit.retryAfterSeconds;
    return Response.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` },
      { status: 429, headers: { 'Retry-After': String(wait) } },
    );
  }

  const row = findUserByEmail(email);

  /* Same message and roughly the same work either way: never reveal which
   * emails exist. */
  if (!row || !verifyPassword(password, row.password_hash)) {
    noteLoginFailure({ email, ip });
    audit({ actorEmail: email.slice(0, 200), action: 'auth.login_failed', detail: row ? 'bad password' : 'no such email', ip });
    return fail('Those credentials did not match.', 401);
  }

  noteLoginSuccess({ email });
  const { token } = createSession(row.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
  audit({ actorId: row.id, actorEmail: row.email, action: 'auth.login', detail: row.role, ip });
  return ok({ user: { id: row.id, email: row.email, name: row.name, role: row.role } });
}
