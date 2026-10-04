import { NextResponse } from 'next/server';
import type { CourseModule } from './curriculum';

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/* Turn a requireUser()/requireTeacher() throw into a proper response body. */
export function authError(e: unknown): NextResponse | null {
  const m = e instanceof Error ? e.message : '';
  if (m === 'UNAUTHENTICATED') return fail('sign in required', 401);
  if (m === 'FORBIDDEN') return fail('your account cannot do that', 403);
  return null;
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

/*
 * A module as a student may see it: the answer key and explanations are
 * stripped, so grading is genuinely server-side and the answers are not sitting
 * in the browser bundle.
 */
export function publicModule(m: CourseModule) {
  return {
    ...m,
    assessment: m.assessment.map((q) => ({ q: q.q, options: q.options })),
  };
}

export function publicModules(mods: CourseModule[]) {
  return mods.map(publicModule);
}
