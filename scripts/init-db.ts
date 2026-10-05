/*
 * Manual first-run bootstrap for a local or scripted deployment. The same logic
 * runs automatically from src/instrumentation.ts when the server starts, so
 * this exists for explicit use (and prints the result in full). Idempotent:
 * safe to run on every boot.
 *
 *   DZ_ADMIN_EMAIL=you@example.edu DZ_ADMIN_PASSWORD=... npm run init:db
 */
import { bootstrapInstance } from '../src/lib/bootstrap';

const result = bootstrapInstance();
console.log(`dead3ars db ready: ${result.modules} module(s) on disk`);

switch (result.admin) {
  case 'existing':
    console.log('an admin account already exists — leaving accounts untouched');
    break;
  case 'skipped':
    console.log('no admin created (DZ_INIT_ADMIN=0 or an admin already exists)');
    break;
  case 'promoted':
    console.log(`promoted ${result.adminEmail} to admin`);
    break;
  case 'created':
    console.log(`created admin account: ${result.adminEmail}`);
    if (result.generatedPassword) {
      console.log(`  generated password (shown once): ${result.generatedPassword}`);
      console.log('  set DZ_ADMIN_PASSWORD and re-run, or change it after first sign-in.');
    }
    break;
}
