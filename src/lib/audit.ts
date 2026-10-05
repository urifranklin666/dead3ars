import { db } from './db';

/*
 * Append-only audit trail. Every privileged mutation records who did it, to
 * what, and from where. Deliberately fire-and-forget: a logging failure must
 * never break the action it is describing, and nothing here is read back on a
 * request path except the admin console.
 */

export type AuditAction =
  | 'auth.register'
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.login_throttled'
  | 'auth.logout'
  | 'class.create'
  | 'class.rename'
  | 'class.delete'
  | 'class.rotate_code'
  | 'class.join'
  | 'assignment.create'
  | 'assignment.delete'
  | 'roster.import'
  | 'submission.save'
  | 'grade.record'
  | 'grade.delete'
  | 'announcement.post'
  | 'announcement.delete'
  | 'discussion.post'
  | 'discussion.delete'
  | 'admin.role_change';

export interface AuditInput {
  actorId?: number | null;
  actorEmail?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string | number;
  detail?: string;
  ip?: string;
}

/* Best-effort client IP from the proxy headers a reverse proxy sets. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim().slice(0, 64);
  return (req.headers.get('x-real-ip') ?? '').slice(0, 64);
}

export function audit(input: AuditInput): void {
  try {
    db()
      .prepare(
        `INSERT INTO audit_log (actor_id, actor_email, action, target_type, target_id, detail, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.actorId ?? null,
        input.actorEmail ?? '',
        input.action,
        input.targetType ?? '',
        String(input.targetId ?? ''),
        input.detail ?? '',
        input.ip ?? '',
      );
  } catch {
    /* never let the trail break the thing it is recording */
  }
}

export interface AuditRow {
  id: number;
  actor_id: number | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  ip: string;
  created_at: string;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

/* Newest first. An optional action prefix narrows the list ("auth." shows every
 * sign-in, "class." every roster change). */
export function listAudit(opts: { action?: string; page?: number; pageSize?: number } = {}): AuditPage {
  const pageSize = Math.min(200, Math.max(10, opts.pageSize ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const action = opts.action?.trim() ? `${opts.action.trim()}%` : '%';

  const total = (
    db().prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE ?').get(action) as { n: number }
  ).n;

  const rows = db()
    .prepare(
      `SELECT * FROM audit_log WHERE action LIKE ?
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(action, pageSize, (page - 1) * pageSize) as unknown as AuditRow[];

  return { rows, total, page, pageSize };
}
