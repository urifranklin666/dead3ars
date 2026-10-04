import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { getModule } from '@/lib/curriculum';
import { recordAttempt, recordProgress } from '@/lib/progress';

/* Grading happens here, on the server. The client never receives the answer key
 * (see publicModule in lib/api.ts), so this is the only place answers live. */
const Body = z.object({
  moduleId: z.string(),
  answers: z.array(z.number().int()),
});

const PASS = 0.7;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Bad submission.');

    const { moduleId, answers } = parsed.data;
    const mod = getModule(moduleId);
    if (!mod) return fail(`No such module: ${moduleId}`, 404);

    const total = mod.assessment.length;
    if (answers.length !== total) {
      return fail(`Expected ${total} answers, got ${answers.length}.`);
    }

    const results = mod.assessment.map((q, i) => ({
      correct: answers[i] === q.answer,
      answer: q.answer,
      explain: q.explain,
    }));
    const score = results.filter((r) => r.correct).length;
    const passed = score / total >= PASS;

    recordAttempt(user.id, moduleId, score, total, answers);
    if (passed) recordProgress(user.id, moduleId, 'assessment-passed');

    /* Explanations are released only after grading, so they can teach. */
    return ok({ score, total, passed, results });
  } catch (e) {
    return authError(e) ?? fail('could not grade your answers', 500);
  }
}
