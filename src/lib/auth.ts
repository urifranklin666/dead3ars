import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, findUserById, type UserRow } from './db';

export const SESSION_COOKIE = 'dz_session';
const SESSION_DAYS = 14;

/* ---------- passwords (scrypt, salted, constant-time compare) ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ---------- sessions ---------- */

export function createSession(userId: number): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db()
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expires.toISOString());
  return { token, expiresAt: expires.toISOString() };
}

export function destroySession(token: string): void {
  db().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRow['role'];
}

export function userForToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(token) as { id: number; email: string; name: string; role: SessionUser['role']; expires_at: string } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/* Server-component / route-handler helpers (cookies() is async in Next 15+). */

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return userForToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export async function requireTeacher(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'teacher' && user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

/* ---------- convenience used by the seed script and API ---------- */

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: SessionUser['role'];
}): SessionUser {
  const existing = db().prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing) throw new Error(`email already registered: ${input.email}`);
  const info = db()
    .prepare('INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)')
    .run(input.email, input.name, input.role, hashPassword(input.password));
  const user = findUserById(Number(info.lastInsertRowid))!;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
