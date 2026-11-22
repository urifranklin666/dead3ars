import { NextResponse } from 'next/server';
import { isStaff, viewer } from '@/lib/session';
import {
  killAllLabs,
  launchLabsForClass,
  setAllLabsPaused,
  teacherLabsSnapshot,
} from '@/lib/labs';

export async function GET() {
  const user = await viewer();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 });
  }
  try {
    const snap = await teacherLabsSnapshot();
    return NextResponse.json(snap);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to reach lab daemon' },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const user = await viewer();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: 'pause-all' | 'resume-all' | 'class-launch';
    classId?: number;
    moduleId?: string;
  };
  try {
    if (body.action === 'pause-all' || body.action === 'resume-all') {
      const count = await setAllLabsPaused(user.id, body.action === 'pause-all');
      return NextResponse.json({ ok: true, count });
    }
    if (body.action === 'class-launch') {
      if (!body.classId || !body.moduleId) {
        return NextResponse.json({ error: 'classId and moduleId required' }, { status: 400 });
      }
      const res = await launchLabsForClass(Number(body.classId), body.moduleId, user.id);
      return NextResponse.json({ ok: true, ...res });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Teacher lab action failed' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const user = await viewer();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 });
  }
  try {
    const stopped = await killAllLabs(user.id);
    return NextResponse.json({ ok: true, stopped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to stop labs' },
      { status: 502 },
    );
  }
}
