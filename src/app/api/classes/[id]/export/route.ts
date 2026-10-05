import { requireTeacher } from '@/lib/auth';
import { authError, fail } from '@/lib/api';
import { classById, classCsv, ownedClass } from '@/lib/classroom';

/* CSV of the class gradebook, for a teacher's own spreadsheet. Served as a
 * download with an explicit filename; the roster never leaves the owner. */

export async function GET(_req: Request, ctx: RouteContext<'/api/classes/[id]/export'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);

    const klass = ownedClass(teacher.id, classId);
    if (!klass) return fail('No such class.', 404);

    const csv = classCsv(classId);
    if (csv === null) return fail('No such class.', 404);

    const slug = classById(classId)!.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'class';
    return new Response(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="dead3ars-${slug}.csv"`,
      },
    });
  } catch (e) {
    return authError(e) ?? fail('could not build the export', 500);
  }
}
