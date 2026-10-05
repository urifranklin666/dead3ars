import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { getModule } from '@/lib/curriculum';
import {
  getRubric,
  listAssignments,
  ownedAssignment,
  setAssignmentDue,
  setRubric,
  unassignModule,
} from '@/lib/classroom';

/* One assignment, by id — the object the grading and student views hang off.
 * A teacher reaches it through its class; the routes enforce that. */

const Patch = z.object({
  dueAt: z.string().max(40).nullable().optional(),
  rubric: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(500).default(''),
        points: z.number().min(0).max(1000),
      }),
    )
    .max(20)
    .optional(),
});

export async function GET(_req: Request, ctx: RouteContext<'/api/assignments/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    const assignment = ownedAssignment(teacher.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);

    return ok({ assignment, rubric: getRubric(assignmentId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the assignment', 500);
  }
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/assignments/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    let assignment = ownedAssignment(teacher.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);

    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Nothing to change.');

    if (parsed.data.dueAt !== undefined) {
      assignment = setAssignmentDue(assignmentId, parsed.data.dueAt) ?? assignment;
    }

    const rubric = parsed.data.rubric !== undefined ? setRubric(assignmentId, parsed.data.rubric) : getRubric(assignmentId);
    return ok({ assignment, rubric });
  } catch (e) {
    return authError(e) ?? fail('could not update the assignment', 500);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/assignments/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) return fail('Bad assignment id.', 400);

    const assignment = ownedAssignment(teacher.id, assignmentId);
    if (!assignment) return fail('No such assignment.', 404);
    if (!getModule(assignment.module_id)) return fail('No such module.', 404);

    unassignModule(teacher.id, assignment.class_id, assignment.module_id);
    return ok({ removed: assignmentId, assignments: listAssignments(assignment.class_id) });
  } catch (e) {
    return authError(e) ?? fail('could not remove the assignment', 500);
  }
}
