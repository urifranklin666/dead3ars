/*
 * Runs once when the server instance starts, before it serves requests. Opening
 * the database applies the schema, and bootstrapInstance() ensures an admin
 * account exists — so a container carrying only the standalone server (no tsx,
 * no scripts) still comes up usable. See src/lib/bootstrap.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { bootstrapInstance } = await import('./lib/bootstrap');
  const result = bootstrapInstance();

  const parts = [`${result.modules} module(s) ready`];
  if (result.admin === 'created') {
    parts.push(`created admin ${result.adminEmail}`);
    if (result.generatedPassword) parts.push(`generated password: ${result.generatedPassword}`);
  } else if (result.admin === 'promoted') {
    parts.push(`promoted ${result.adminEmail} to admin`);
  }
  console.log(`[dead3ars] ${parts.join(' · ')}`);
}
