import { NextResponse } from 'next/server';
import { isStaff, viewer } from '@/lib/session';
import {
  getLabRow,
  getLabTranscript,
  logLabEvent,
  mintLabTicket,
  resetLab,
  setLabPaused,
  stopLab,
  submitLabFlag,
} from '@/lib/labs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await viewer();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const transcript = await getLabTranscript(id);
    return NextResponse.json({ labId: id, transcript });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to fetch transcript' },
      { status: 502 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await viewer();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await ctx.params;
  const row = getLabRow(id);
  if (!row) return NextResponse.json({ error: 'Lab not found' }, { status: 404 });

  const owner = row.user_id === user.id;
  const staff = isStaff(user);
  if (!owner && !staff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'ticket' | 'reset' | 'flag' | 'pause' | 'resume';
    mode?: 'ro' | 'rw';
    flag?: string;
  };

  try {
    if (body.action === 'ticket') {
      const mode: 'ro' | 'rw' = owner
        ? (body.mode === 'ro' ? 'ro' : 'rw')
        : (body.mode === 'rw' ? 'rw' : 'ro');
      if (!owner && staff) {
        logLabEvent(
          id,
          user.id,
          row.module_id,
          mode === 'rw' ? 'teacher_assist' : 'teacher_observe',
          `${user.name} attached (${mode.toUpperCase()})`,
        );
      }
      const ticket = mintLabTicket({ labId: id, userId: user.id, role: user.role, mode });
      return NextResponse.json({ ticket, mode });
    }

    if (body.action === 'reset') {
      const lab = await resetLab(id, user.id);
      return NextResponse.json({ lab });
    }

    if (body.action === 'pause' || body.action === 'resume') {
      if (!staff) return NextResponse.json({ error: 'Teacher or admin access required' }, { status: 403 });
      await setLabPaused(id, user.id, body.action === 'pause');
      return NextResponse.json({ ok: true, paused: body.action === 'pause' });
    }

    if (body.action === 'flag') {
      if (!owner) return NextResponse.json({ error: 'Only the student owner can submit flags' }, { status: 403 });
      if (!body.flag || typeof body.flag !== 'string') {
        return NextResponse.json({ error: 'Flag is required' }, { status: 400 });
      }
      const result = submitLabFlag(user.id, id, body.flag);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lab action failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await viewer();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await ctx.params;
  const row = getLabRow(id);
  if (!row) return NextResponse.json({ error: 'Lab not found' }, { status: 404 });

  if (row.user_id !== user.id && !isStaff(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await stopLab(id, user.id, row.user_id === user.id ? 'student_stopped' : 'teacher_stopped');
  return NextResponse.json({ ok: true });
}
