import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import {
  assignmentById,
  assignmentWork,
  deleteGrade,
  getRubric,
  ownedAssignment,
  recordGrade,
} from '@/lib/classroom';
import { audit, clientIp } from '@/lib/audit';

/* The teacher's grading view of one assignment: every enrolled student's
 * submission plus the grade, or POST a grade. Ownership is checked through the
 * assignment's class, so a teacher cannot grade into another teacher's class. */

const Body = z.object({
  studentId: z.number().int().positive(),
  score: z.number().min(0).max(1000),
  max: z.number().min(1).max(1000),
  feedback: z.string().max(4000).default(''),
});

async function assignmentIdFrom(ctx: RouteContext<'/api/assignments/[id]/grades'>) {
  const { id } = await ctx.params;
  return Number(id);
}

export async function GET(_req: Request, ctx: RouteContext<'/api/assignments/[id]/grades'>) {
  try {
    const teacher = await requireTeacher();
    const assignmentId = await assignmentIdFrom(ctx);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    const assignment = ownedAssignment(teacher.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);

    return ok({ assignment, rubric: getRubric(assignmentId), work: assignmentWork(assignmentId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the work', 500);
  }
}

export async function POST(req: Request, ctx: RouteContext<'/api/assignments/[id]/grades'>) {
  try {
    const teacher = await requireTeacher();
    const assignmentId = await assignmentIdFrom(ctx);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    const assignment = ownedAssignment(teacher.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('A grade needs a student, a score, and a maximum.');
    if (parsed.data.score > parsed.data.max) return fail('The score cannot exceed the maximum.');

    /* Only enrolled students can be graded; this also keeps the column honest. */
    const rows = assignmentWork(assignmentId);
    if (!rows.some((r) => r.student.id === parsed.data.studentId)) {
      return fail('That student is not enrolled in this class.', 400);
    }

    const grade = recordGrade(assignmentId, parsed.data.studentId, parsed.data.score, parsed.data.max, parsed.data.feedback);
    audit({
      actorId: teacher.id,
      actorEmail: teacher.email,
      action: 'grade.record',
      targetType: 'assignment',
      targetId: assignmentId,
      detail: `student ${parsed.data.studentId}: ${parsed.data.score}/${parsed.data.max}`,
      ip: clientIp(req),
    });
    return ok({ grade }, 201);
  } catch (e) {
    return authError(e) ?? fail('could not save the grade', 500);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<'/api/assignments/[id]/grades'>) {
  try {
    const teacher = await requireTeacher();
    const assignmentId = await assignmentIdFrom(ctx);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    if (!ownedAssignment(teacher.id, assignmentId)) return fail('No such assignment.', 404);

    const raw = new URL(req.url).searchParams.get('studentId') ?? '';
    const studentId = Number(raw);
    if (!Number.isInteger(studentId)) return fail('Bad student id.', 400);
    if (!deleteGrade(assignmentId, studentId)) return fail('That student has no grade to remove.', 404);

    return ok({ removed: studentId, assignment: assignmentById(assignmentId) });
  } catch (e) {
    return authError(e) ?? fail('could not remove the grade', 500);
  }
}
