import { NextResponse } from 'next/server';
import { viewer } from '@/lib/session';
import { getActiveLabForUser, getScenario, startOrResumeLab } from '@/lib/labs';

export async function GET(req: Request) {
  const user = await viewer();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const url = new URL(req.url);
  const moduleId = url.searchParams.get('moduleId') || undefined;
  const lab = await getActiveLabForUser(user.id, moduleId);
  return NextResponse.json({ lab });
}

export async function POST(req: Request) {
  const user = await viewer();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { moduleId?: string };
  if (!body.moduleId || !getScenario(body.moduleId)) {
    return NextResponse.json({ error: 'Unknown or unavailable lab scenario' }, { status: 400 });
  }

  try {
    const lab = await startOrResumeLab(user.id, body.moduleId);
    return NextResponse.json({ lab }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start lab VM' },
      { status: 500 },
    );
  }
}
