import { cookies } from 'next/headers';
import { z } from 'zod';
import { createUser, createSession, SESSION_COOKIE } from '@/lib/auth';
import { db, findUserByEmail } from '@/lib/db';
import { audit, clientIp } from '@/lib/audit';
import { fail, ok, SESSION_COOKIE_OPTS } from '@/lib/api';

const Body = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
  role: z.enum(['student', 'teacher']).default('student'),
  joinCode: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail('Check the form: a name, a valid email, and a password of at least 8 characters.');
  }
  const { email, name, password, role, joinCode } = parsed.data;
  const code = (joinCode || '').trim();

  if (findUserByEmail(email)) return fail('That email is already registered.');

  // Optional invite-only / class join-code gate (enabled when DZ_INVITE_ONLY=1)
  const inviteOnly = process.env.DZ_INVITE_ONLY === '1';
  const masterInvite = (process.env.DZ_INVITE_CODE || '').trim();
  const matchedClass = code
    ? (db().prepare('SELECT id FROM classes WHERE UPPER(join_code) = UPPER(?)').get(code) as { id: number } | undefined)
    : undefined;

  if (inviteOnly) {
    const validMaster = Boolean(masterInvite && code && code === masterInvite);
    if (!validMaster && !matchedClass) {
      return fail('Registration is invite-only. Enter a valid class join code or invite code.', 403);
    }
    if (role === 'teacher' && !validMaster) {
      return fail('Teacher accounts require the instructor invite code.', 403);
    }
  }

  try {
    const user = createUser({ email, name, password, role });
    if (matchedClass && role === 'student') {
      db()
        .prepare('INSERT OR IGNORE INTO enrollments (class_id, student_id) VALUES (?, ?)')
        .run(matchedClass.id, user.id);
    }
    const { token } = createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
    audit({ actorId: user.id, actorEmail: user.email, action: 'auth.register', detail: role, ip: clientIp(req) });
    return ok({ user });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'could not create the account', 500);
  }
}
