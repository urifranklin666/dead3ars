import { requireTeacher } from '@/lib/auth';
import { authError, ok } from '@/lib/api';
import { cohort, attemptsFor } from '@/lib/progress';
import { curriculumStats } from '@/lib/curriculum';

/* Teacher-only: the whole cohort's completion in one call. */
export async function GET(req: Request) {
  try {
    await requireTeacher();
    const studentId = new URL(req.url).searchParams.get('studentId');

    if (studentId) {
      const id = Number(studentId);
      return ok({ attempts: attemptsFor(id) });
    }

    return ok({ cohort: cohort(), stats: curriculumStats() });
  } catch (e) {
    return authError(e) ?? ok({ error: 'could not load the cohort' }, 500);
  }
}
