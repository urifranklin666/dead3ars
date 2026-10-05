import { db } from '@/lib/db';
import { loadModules } from '@/lib/curriculum';

/*
 * Liveness probe for a deploy platform. Checks two things a plain 200 does not:
 * that the content directory is readable (a mis-traced container otherwise
 * serves fine until the first module request) and that the database answers.
 * Reports the module count so a bad image is visible from the health output
 * alone. Returns 200 when healthy, 503 when not.
 */
export async function GET() {
  const checks: Record<string, string> = {};

  let modules = 0;
  try {
    modules = loadModules().length;
    checks.content = modules > 0 ? `ok (${modules} modules)` : 'empty';
  } catch (e) {
    checks.content = `error: ${e instanceof Error ? e.message : 'unreadable'}`;
  }

  try {
    const row = db().prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    if (!row || row.ok !== 1) throw new Error('unexpected result');
    checks.database = 'ok';
  } catch (e) {
    checks.database = `error: ${e instanceof Error ? e.message : 'unreachable'}`;
  }

  const healthy = checks.content.startsWith('ok') && checks.database === 'ok';
  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      modules,
      uptime: Math.round(process.uptime()),
    },
    { status: healthy ? 200 : 503 },
  );
}
