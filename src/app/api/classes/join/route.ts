import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { classesForStudent, enrollByCode } from '@/lib/classroom';
import { audit, clientIp } from '@/lib/audit';

/* A student enrols in a class with its join code. The code is the only thing
 * that grants membership, so a student cannot enumerate classes they were not
 * invited to. */

const Body = z.object({ code: z.string().min(1).max(32) });

export async function GET() {
  try {
    const student = await requireUser();
    return ok({ classes: classesForStudent(student.id) });
  } catch (e) {
    return authError(e) ?? fail('could not load your classes', 500);
  }
}

export async function POST(req: Request) {
  try {
    const student = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Enter the join code your teacher gave you.');

    try {
      const klass = enrollByCode(student.id, parsed.data.code);
      audit({
        actorId: student.id,
        actorEmail: student.email,
        action: 'class.join',
        targetType: 'class',
        targetId: klass.id,
        detail: klass.name,
        ip: clientIp(req),
      });
      return ok({ klass });
    } catch (e) {
      if (e instanceof Error && e.message === 'NO_SUCH_CLASS') {
        return fail('That join code did not match any class.', 404);
      }
      throw e;
    }
  } catch (e) {
    return authError(e) ?? fail('could not join the class', 500);
  }
}
