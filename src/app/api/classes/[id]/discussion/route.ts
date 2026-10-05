import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { canSeeClass, deleteDiscussionPost, listDiscussion, postDiscussion } from '@/lib/classroom';

/* Class discussion. Readable and writable by the class's teacher and its
 * enrolled students — the membership check is canSeeClass(). */

const Body = z.object({ body: z.string().min(1).max(8000), parentId: z.number().int().positive().nullable().default(null) });

export async function GET(_req: Request, ctx: RouteContext<'/api/classes/[id]/discussion'>) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!canSeeClass(user.id, user.role, classId)) return fail('No such class.', 404);
    return ok({ threads: listDiscussion(classId) });
  } catch (e) {
    return authError(e) ?? fail('could not load the discussion', 500);
  }
}

export async function POST(req: Request, ctx: RouteContext<'/api/classes/[id]/discussion'>) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!canSeeClass(user.id, user.role, classId)) return fail('No such class.', 404);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Write something first.');

    try {
      const post = postDiscussion(classId, user.id, parsed.data.body, parsed.data.parentId);
      return ok({ post }, 201);
    } catch (e) {
      if (e instanceof Error && e.message === 'BAD_PARENT') {
        return fail('That thread is not in this class.', 400);
      }
      throw e;
    }
  } catch (e) {
    return authError(e) ?? fail('could not post your reply', 500);
  }
}

/* A teacher may delete any post in their class; a student only their own. */
export async function DELETE(req: Request, ctx: RouteContext<'/api/classes/[id]/discussion'>) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const classId = Number(id);
    if (!Number.isInteger(classId)) return fail('Bad class id.', 400);
    if (!canSeeClass(user.id, user.role, classId)) return fail('No such class.', 404);

    const postId = Number(new URL(req.url).searchParams.get('postId') ?? '');
    if (!Number.isInteger(postId)) return fail('Bad post id.', 400);

    const threads = listDiscussion(classId);
    const find = (list: typeof threads, target: number): (typeof threads)[number] | undefined => {
      for (const t of list) {
        if (t.id === target) return t;
        const hit = find(t.replies, target);
        if (hit) return hit;
      }
      return undefined;
    };
    const post = find(threads, postId);
    if (!post) return fail('No such post.', 404);
    if (post.author_id !== user.id && user.role !== 'teacher' && user.role !== 'admin') {
      return fail('You can only delete your own posts.', 403);
    }

    deleteDiscussionPost(postId);
    return ok({ removed: postId });
  } catch (e) {
    return authError(e) ?? fail('could not remove the post', 500);
  }
}
