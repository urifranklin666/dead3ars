import { db, findUserByEmail, setUserRole } from './db';
import { createUser } from './auth';
import { loadModules } from './curriculum';

/*
 * First-run bootstrap, shared by instrumentation.ts (so a container with only
 * the standalone server still initialises) and scripts/init-db.ts (for local or
 * manual runs). Idempotent: opening the database applies the schema, and an
 * existing admin is left alone.
 *
 * Environment:
 *   DZ_ADMIN_EMAIL     admin account to ensure (default admin@dead3ars.local)
 *   DZ_ADMIN_PASSWORD  password for it; if absent a random one is generated
 *   DZ_INIT_ADMIN=0    skip admin creation entirely
 */

export interface BootstrapResult {
  modules: number;
  admin: 'existing' | 'created' | 'promoted' | 'skipped';
  adminEmail?: string;
  generatedPassword?: string;
}

function randomPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url').slice(0, 16);
}

export function bootstrapInstance(): BootstrapResult {
  db(); // opens the file, applies the schema
  const modules = loadModules().length;

  const anyAdmin = db().prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as
    | { id: number }
    | undefined;
  if (anyAdmin || process.env.DZ_INIT_ADMIN === '0') {
    return { modules, admin: anyAdmin ? 'existing' : 'skipped' };
  }

  const email = (process.env.DZ_ADMIN_EMAIL ?? 'admin@dead3ars.local').trim();
  const provided = process.env.DZ_ADMIN_PASSWORD;
  const useProvided = typeof provided === 'string' && provided.length >= 8;

  /* If the configured address already belongs to a non-admin account, promote
   * it rather than failing — an instance must always end up with a way in. */
  const found = findUserByEmail(email);
  if (found) {
    setUserRole(found.id, 'admin');
    return { modules, admin: 'promoted', adminEmail: email };
  }

  const password = useProvided ? provided! : randomPassword();
  createUser({ email, name: 'Instance Admin', password, role: 'admin' });
  return { modules, admin: 'created', adminEmail: email, generatedPassword: useProvided ? undefined : password };
}
