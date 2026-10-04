import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authError, fail, ok } from '@/lib/api';
import { getModule } from '@/lib/curriculum';
import { getNote, saveNote } from '@/lib/progress';

const Body = z.object({ moduleId: z.string(), body: z.string().max(20000) });

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const moduleId = new URL(req.url).searchParams.get('moduleId') ?? '';
    if (!getModule(moduleId)) return fail('No such module.', 404);
    return ok({ moduleId, body: getNote(user.id, moduleId) });
  } catch (e) {
    return authError(e) ?? fail('could not read notes', 500);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('Bad note.');
    const { moduleId, body } = parsed.data;
    if (!getModule(moduleId)) return fail('No such module.', 404);
    saveNote(user.id, moduleId, body);
    return ok({ saved: true });
  } catch (e) {
    return authError(e) ?? fail('could not save notes', 500);
  }
}
