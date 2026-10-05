import { db } from './db';

/*
 * Failed-sign-in throttling, a sliding window over login_attempts.
 *
 * Two independent dimensions, because they stop different attacks:
 *
 *   account — keyed on the submitted email, whether or not it exists. This is
 *     the load-bearing control: it cannot be escaped by rotating source
 *     addresses, so password guessing against one account is bounded however
 *     the attacker is routed. It is also why the window is keyed on the
 *     *attempted* address rather than a real user id — refusing a nonexistent
 *     account exactly as often as a real one keeps "does this account exist?"
 *     out of the response.
 *
 *   ip — keyed on the client address, so one host spraying many accounts is
 *     slowed too. Deliberately far looser than the account rule, because this
 *     is classroom software that commonly runs behind a campus NAT: dozens of
 *     students share one address, and a handful of mistyped passwords must not
 *     lock out the whole class. It is a runaway guard against an automated
 *     spray, not a per-student control, and a deployment behind a large shared
 *     address can disable it with DZ_LOGIN_IP_LIMIT=0. Note also that the
 *     address comes from the proxy headers (see clientIp), so this dimension is
 *     only meaningful behind a proxy that *overwrites* them.
 *
 * Counters live in the database, not in memory, so every worker and every
 * restart sees the same state — an in-memory table would reset on deploy and
 * would not be shared across replicas. All three values are tunable:
 *
 *   DZ_LOGIN_ACCOUNT_LIMIT   failures per account per window (default 5)
 *   DZ_LOGIN_IP_LIMIT        failures per address per window (default 50, 0 disables)
 *   DZ_LOGIN_WINDOW_MINUTES  window length (default 15)
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) ? n : fallback;
}

const WINDOW_MINUTES = Math.max(1, envInt('DZ_LOGIN_WINDOW_MINUTES', 15));
const WINDOW_SECONDS = WINDOW_MINUTES * 60;
const ACCOUNT_LIMIT = Math.max(1, envInt('DZ_LOGIN_ACCOUNT_LIMIT', 5));
/* Zero or negative disables the address dimension (see the note above). */
const IP_LIMIT = envInt('DZ_LOGIN_IP_LIMIT', 50);

export type LimitScope = 'account' | 'ip';

export interface LoginLimit {
  allowed: boolean;
  retryAfterSeconds: number;
  scope: LimitScope | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 200);
}

function failuresInWindow(kind: LimitScope, key: string): { count: number; oldestEpoch: number | null } {
  /* Both sides of the comparison are computed by SQLite against its own clock,
   * so the 'YYYY-MM-DD HH:MM:SS' text the DEFAULT writes is never compared
   * against an ISO string built in JavaScript. */
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n,
              CAST(strftime('%s', MIN(created_at)) AS INTEGER) AS oldest
         FROM login_attempts
        WHERE kind = ? AND key = ? AND created_at > datetime('now', ?)`,
    )
    .get(kind, key, `-${WINDOW_SECONDS} seconds`) as { n: number; oldest: number | null };
  return { count: row.n, oldestEpoch: row.oldest };
}

/* How long until the oldest failure in the window ages out, and the door opens
 * by that much. Guarded to at least a second so a blocked caller always gets a
 * usable Retry-After. */
function retryAfterSeconds(oldestEpoch: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(1, oldestEpoch + WINDOW_SECONDS - now);
}

/* Consulted before the password is verified, so a throttled attempt costs no
 * scrypt work. */
export function loginLimit(input: { email: string; ip: string }): LoginLimit {
  const account = failuresInWindow('account', normalizeEmail(input.email));
  if (account.count >= ACCOUNT_LIMIT && account.oldestEpoch !== null) {
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(account.oldestEpoch), scope: 'account' };
  }

  const ip = input.ip.trim();
  if (IP_LIMIT > 0 && ip) {
    const byIp = failuresInWindow('ip', ip);
    if (byIp.count >= IP_LIMIT && byIp.oldestEpoch !== null) {
      return { allowed: false, retryAfterSeconds: retryAfterSeconds(byIp.oldestEpoch), scope: 'ip' };
    }
  }

  return { allowed: true, retryAfterSeconds: 0, scope: null };
}

export function noteLoginFailure(input: { email: string; ip: string }): void {
  try {
    const handle = db();
    handle.prepare('INSERT INTO login_attempts (kind, key) VALUES (?, ?)').run('account', normalizeEmail(input.email));
    const ip = input.ip.trim();
    if (ip) handle.prepare('INSERT INTO login_attempts (kind, key) VALUES (?, ?)').run('ip', ip);
    /* Opportunistic pruning: keeps a little more than one window so the count
     * above is never truncated by the cleanup itself, and bounds the table. */
    handle.prepare("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 hour')").run();
  } catch {
    /* Never let throttling break sign-in. */
  }
}

/* A correct password clears that account's failures. The address bucket is
 * deliberately left alone: otherwise an attacker with any valid account of
 * their own could reset it between guesses. */
export function noteLoginSuccess(input: { email: string }): void {
  try {
    db()
      .prepare("DELETE FROM login_attempts WHERE kind = 'account' AND key = ?")
      .run(normalizeEmail(input.email));
  } catch {
    /* ignore */
  }
}
