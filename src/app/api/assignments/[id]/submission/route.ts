import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import {
  getRubric,
  gradeFor,
  studentAssignment,
  submissionFor,
  submitWork,
} from '@/lib/classroom';
import { audit, clientIp } from '@/lib/audit';

/* A student's own work on one assignment: read it back, or submit/resubmit.
 * Reachable only through enrolment in the assignment's class, so a student
 * cannot submit to — or read — an assignment set for another class. */

const Body = z.object({
  body: z.string().max(20000).default(''),
  link: z.string().max(500).default(''),
});

export async function GET(_req: Request, ctx: RouteContext<'/api/assignments/[id]/submission'>) {
  try {
    const student = await requireUser();
    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    const assignment = studentAssignment(student.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);

    return ok({
      assignment,
      rubric: getRubric(assignmentId),
      submission: submissionFor(assignmentId, student.id) ?? null,
      grade: gradeFor(assignmentId, student.id) ?? null,
    });
  } catch (e) {
    return authError(e) ?? fail('could not load your work', 500);
  }
}

export async function PUT(req: Request, ctx: RouteContext<'/api/assignments/[id]/submission'>) {
  try {
    const student = await requireUser();
    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    if (!studentAssignment(student.id, assignmentId)) return fail('No such assignment.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Write something or add a link before submitting.');
    if (parsed.data.body.trim() === '' && parsed.data.link.trim() === '') {
      return fail('Write something or add a link before submitting.');
    }

    const submission = submitWork(assignmentId, student.id, parsed.data.body, parsed.data.link);
    audit({
      actorId: student.id,
      actorEmail: student.email,
      action: 'submission.save',
      targetType: 'assignment',
      targetId: assignmentId,
      detail: `${submission.body.length} chars${submission.link ? ' + link' : ''}`,
      ip: clientIp(req),
    });
    return ok({ submission });
  } catch (e) {
    return authError(e) ?? fail('could not save your submission', 500);
  }
}
