import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { getModule } from '@/lib/curriculum';
import { assignModule, listAssignments, ownedClass, unassignModule } from '@/lib/classroom';

/* Assign a module to a class, or remove it. The module id is validated against
 * the curriculum so a teacher cannot assign something that does not exist. */

const Body = z.object({
  moduleId: z.string().regex(/^m\d{2}-[a-z0-9-]+$/),
  /* Accepts "2026-11-01" or "2026-11-01T17:00"; normalised in lib/classroom. */
  dueAt: z.string().max(40).nullable().optional(),
});

export async function GET(_req: Request, ctx: RouteContext<'/api/classes/[id]/assignments'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);
    return ok({ assignments: listAssignments(classId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the assignments', 500);
  }
}

export async function POST(req: Request, ctx: RouteContext<'/api/classes/[id]/assignments'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Give a module to assign.');
    const { moduleId, dueAt } = parsed.data;
    if (!getModule(moduleId)) return fail(`No such module: ${moduleId}`, 404);

    const assignment = assignModule(teacher.id, classId, moduleId, dueAt ?? null);
    return ok({ assignment }, 201);
  } catch (e) {
    return authError(e) ?? fail('could not assign the module', 500);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<'/api/classes/[id]/assignments'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const moduleId = new URL(req.url).searchParams.get('moduleId') ?? '';
    if (!unassignModule(teacher.id, classId, moduleId)) return fail('That module is not assigned.', 404);
    return ok({ removed: moduleId });
  } catch (e) {
    return authError(e) ?? fail('could not remove the assignment', 500);
  }
}
