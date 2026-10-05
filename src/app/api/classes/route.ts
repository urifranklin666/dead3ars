import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { classesForTeacher, createClass } from '@/lib/classroom';
import { audit, clientIp } from '@/lib/audit';

/* Teacher-only: a class is a teacher's roster. Students enrol by join code
 * (see /api/classes/join), never by listing other teachers' classes. */

const Body = z.object({ name: z.string().min(1).max(120) });

export async function GET() {
  try {
    const teacher = await requireTeacher();
    return ok({ classes: classesForTeacher(teacher.id) });
  } catch (e) {
    return authError(e) ?? fail('could not load your classes', 500);
  }
}

export async function POST(req: Request) {
  try {
    const teacher = await requireTeacher();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Give the class a name.');
    const created = createClass(teacher.id, parsed.data.name);
    audit({
      actorId: teacher.id,
      actorEmail: teacher.email,
      action: 'class.create',
      targetType: 'class',
      targetId: created.id,
      detail: created.name,
      ip: clientIp(req),
    });
    return ok({ klass: created }, 201);
  } catch (e) {
    return authError(e) ?? fail('could not create the class', 500);
  }
}
