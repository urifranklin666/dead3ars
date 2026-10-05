import { requireAdmin } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { listUsers } from '@/lib/db';
import { allClasses, instanceStats } from '@/lib/classroom';
import { listAudit } from '@/lib/audit';

/* Instance oversight, admin only. One call returns everything the console
 * needs: counts, the roster of accounts, every class on the instance, and the
 * most recent audit events. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const action = new URL(req.url).searchParams.get('action') ?? undefined;
    return ok({
      stats: instanceStats(),
      users: listUsers().map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at })),
      classes: allClasses(),
      audit: listAudit({ action, pageSize: 50 }),
    });
  } catch (e) {
    return authError(e) ?? fail('could not load the admin overview', 500);
  }
}
