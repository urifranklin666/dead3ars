import { requireUser } from '@/lib/auth';
import { authError, ok } from '@/lib/api';
import { workForStudent } from '@/lib/classroom';

/* The signed-in student's own classwork: every assignment across their classes,
 * with their submission and grade. Always self-scoped — the id comes from the
 * session, never from the request. */
export async function GET() {
  try {
    const student = await requireUser();
    return ok({ work: workForStudent(student.id) });
  } catch (e) {
    return authError(e) ?? ok({ work: [] });
  }
}
