import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { getModule } from '@/lib/curriculum';
import { recordProgress } from '@/lib/progress';

/* Progress is recorded by module id only; the server validates the id against
 * the curriculum so a client cannot invent one. */
const Body = z.object({
  moduleId: z.string(),
  status: z.enum(['engaged', 'lab-complete', 'assessment-passed']),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Bad progress payload.');

    const { moduleId, status } = parsed.data;
    if (!getModule(moduleId)) return fail(`No such module: ${moduleId}`, 404);
    /* Only the server may mark an assessment as passed. */
    if (status === 'assessment-passed') return fail('Assessments are recorded by submitting answers, not by claiming a status.');

    recordProgress(user.id, moduleId, status);
    return ok({ moduleId, status });
  } catch (e) {
    return authError(e) ?? fail('could not record progress', 500);
  }
}
