import { z } from 'zod';
import { requireTeacher } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { deleteAnnouncement, listAnnouncements, ownedClass, postAnnouncement } from '@/lib/classroom';

/* Announcements belong to a class and only its owning teacher posts them. */

const Body = z.object({ title: z.string().max(200).default(''), body: z.string().min(1).max(20000) });

export async function GET(_req: Request, ctx: RouteContext<'/api/classes/[id]/announcements'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);
    return ok({ announcements: listAnnouncements(classId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the announcements', 500);
  }
}

export async function POST(req: Request, ctx: RouteContext<'/api/classes/[id]/announcements'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('An announcement needs a body.');
    const announcement = postAnnouncement(classId, teacher.id, parsed.data.title, parsed.data.body);
    return ok({ announcement }, 201);
  } catch (e) {
    return authError(e) ?? fail('could not post the announcement', 500);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<'/api/classes/[id]/announcements'>) {
  try {
    const teacher = await requireTeacher();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!ownedClass(teacher.id, classId)) return fail('No such class.', 404);

    const annId = Number(new URL(req.url).searchParams.get('announcementId') ?? '');
    if (!Number.isInteger(annId) || !deleteAnnouncement(teacher.id, annId)) {
      return fail('No such announcement.', 404);
    }
    return ok({ removed: annId });
  } catch (e) {
    return authError(e) ?? fail('could not remove the announcement', 500);
  }
}
