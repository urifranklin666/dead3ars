import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { deleteClass, gradebook, listAssignments, ownedClass, renameClass, rotateJoinCode, roster } from '@/lib/classroom';

/* One class, its roster, assignments, and gradebook. Every handler checks that
 * the signed-in teacher owns the class before touching it. */

const Patch = z.object({ name: z.string().min(1).max(120).optional(), rotateCode: z.boolean().optional() });

export async function GET(_req: Request, ctx: RouteContext<'/api/classes/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);

    const klass = ownedClass(teacher.id, classId);
    if (!klass) return fail('No such class.', 404);

    return ok({ klass, roster: roster(classId), assignments: listAssignments(classId), gradebook: gradebook(classId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the class', 500);
  }
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/classes/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Nothing to change.');

    let klass = ownedClass(teacher.id, classId)!;
    if (parsed.data.name !== undefined) klass = renameClass(teacher.id, classId, parsed.data.name) ?? klass;
    if (parsed.data.rotateCode) klass = rotateJoinCode(teacher.id, classId) ?? klass;
    return ok({ klass });
  } catch (e) {
    return authError(e) ?? fail('could not update the class', 500);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/classes/[id]'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!deleteClass(teacher.id, classId)) return fail('No such class.', 404);
    return ok({ deleted: true });
  } catch (e) {
    return authError(e) ?? fail('could not delete the class', 500);
  }
}
