import { NextResponse } from 'next/server';
import { labdHealth } from '@/lib/labs';
import { isStaff, viewer } from '@/lib/session';

export async function GET() {
  const user = await viewer();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const health = await labdHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
