import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { findUserById, setUserRole } from '@/lib/db';
import { audit, clientIp } from '@/lib/audit';

/* Change a user's role. The one admin mutation. Self-demotion is blocked so an
 * admin cannot lock themselves out of the console; the seed's admin is the
 * recovery path if the last admin is ever removed another way. */

const Body = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['student', 'teacher', 'admin']),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Pick a user and a role.');

    const { userId, role } = parsed.data;
    if (userId === admin.id) return fail('You cannot change your own role.');

    const before = findUserById(userId);
    if (!before) return fail('No such user.', 404);
    if (before.role === role) return ok({ user: before, changed: false });

    const user = setUserRole(userId, role);
    if (!user) return fail('No such user.', 404);

    audit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'admin.role_change',
      targetType: 'user',
      targetId: userId,
      detail: `${before.role} -> ${role} (${before.email})`,
      ip: clientIp(req),
    });

    return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, changed: true });
  } catch (e) {
    return authError(e) ?? fail('could not change the role', 500);
  }
}
