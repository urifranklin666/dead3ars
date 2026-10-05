import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { importRoster, ownedClass, parseRosterCsv } from '@/lib/classroom';
import { audit, clientIp } from '@/lib/audit';

/* Bulk roster import. The teacher pastes or uploads CSV — "name,email" or a
 * header row, either column order. New emails get accounts with a generated
 * password, which is returned once so the teacher can hand them out; existing
 * emails are enrolled into the class instead of being recreated. */

const Body = z.object({ csv: z.string().min(1).max(200000) });

function makePassword(): string {
  /* URL-safe, 12 chars — long enough to be worth keeping, easy to read aloud. */
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export async function POST(req: Request, ctx: RouteContext<'/api/classes/[id]/roster/import'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Paste a CSV of names and emails first.');

    const roster = parseRosterCsv(parsed.data.csv);
    if (roster.rows.length === 0) {
      return fail(
        roster.skipped.length
          ? `No usable rows. First problem on line ${roster.skipped[0].line}: ${roster.skipped[0].reason}`
          : 'No rows found in that CSV.',
      );
    }

    const result = importRoster(teacher.id, classId, roster.rows, roster.skipped, makePassword);
    audit({
      actorId: teacher.id,
      actorEmail: teacher.email,
      action: 'roster.import',
      targetType: 'class',
      targetId: classId,
      detail: `${result.created} created, ${result.enrolled} enrolled, ${result.existing} existing`,
      ip: clientIp(req),
    });
    return ok(result, 201);
  } catch (e) {
    return authError(e) ?? fail('could not import the roster', 500);
  }
}
