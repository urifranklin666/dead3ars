import { db } from './db';
import type { SessionUser } from './auth';

export type Status = 'engaged' | 'lab-complete' | 'assessment-passed';

export interface ModuleProgress {
  module_id: string;
  status: Status;
  updated_at: string;
}

const RANK: Record<Status, number> = {
  engaged: 0,
  'lab-complete': 1,
  'assessment-passed': 2,
};

/* Progress is monotonic: re-opening a finished module must not demote it. */
export function recordProgress(userId: number, moduleId: string, status: Status): void {
  const existing = db()
    .prepare('SELECT status FROM progress WHERE user_id = ? AND module_id = ?')
    .get(userId, moduleId) as { status: Status } | undefined;

  if (existing && RANK[existing.status] >= RANK[status]) {
    db()
      .prepare('UPDATE progress SET updated_at = datetime(\'now\') WHERE user_id = ? AND module_id = ?')
      .run(userId, moduleId);
    return;
  }

  db()
    .prepare(
      `INSERT INTO progress (user_id, module_id, status, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, module_id)
       DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
    .run(userId, moduleId, status);
}

export function progressFor(userId: number): ModuleProgress[] {
  return db()
    .prepare('SELECT module_id, status, updated_at FROM progress WHERE user_id = ?')
    .all(userId) as unknown as ModuleProgress[];
}

export function progressMap(userId: number): Record<string, Status> {
  const out: Record<string, Status> = {};
  for (const row of progressFor(userId)) out[row.module_id] = row.status;
  return out;
}

export interface Attempt {
  module_id: string;
  score: number;
  total: number;
  created_at: string;
}

export function recordAttempt(userId: number, moduleId: string, score: number, total: number, answers: unknown): void {
  db()
    .prepare('INSERT INTO quiz_attempts (user_id, module_id, score, total, answers) VALUES (?, ?, ?, ?, ?)')
    .run(userId, moduleId, score, total, JSON.stringify(answers));
}

export function attemptsFor(userId: number): Attempt[] {
  return db()
    .prepare('SELECT module_id, score, total, created_at FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as unknown as Attempt[];
}

export function bestAttempt(userId: number, moduleId: string): Attempt | undefined {
  return db()
    .prepare(
      `SELECT module_id, score, total, created_at FROM quiz_attempts
        WHERE user_id = ? AND module_id = ?
        ORDER BY CAST(score AS REAL) / total DESC, created_at DESC LIMIT 1`,
    )
    .get(userId, moduleId) as Attempt | undefined;
}

/* ---------- private study notes ---------- */

export function getNote(userId: number, moduleId: string): string {
  const row = db()
    .prepare('SELECT body FROM notes WHERE user_id = ? AND module_id = ?')
    .get(userId, moduleId) as { body: string } | undefined;
  return row?.body ?? '';
}

export function saveNote(userId: number, moduleId: string, body: string): void {
  db()
    .prepare(
      `INSERT INTO notes (user_id, module_id, body, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, module_id)
       DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    )
    .run(userId, moduleId, body);
}

/* ---------- teacher view: one query for the whole cohort ---------- */

export interface CohortRow {
  id: number;
  name: string;
  email: string;
  modules_started: number;
  labs_complete: number;
  assessments_passed: number;
  quiz_average: number | null;
  last_active: string | null;
}

export function cohort(): CohortRow[] {
  const rows = db()
    .prepare(
      `SELECT u.id, u.name, u.email,
              (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id)                                   AS modules_started,
              (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id AND p.status != 'engaged')          AS labs_complete,
              (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id AND p.status = 'assessment-passed') AS assessments_passed,
              (SELECT ROUND(AVG(CAST(q.score AS REAL) / q.total) * 100) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_average,
              (SELECT MAX(p.updated_at) FROM progress p WHERE p.user_id = u.id)                           AS last_active
         FROM users u
        WHERE u.role = 'student'
        ORDER BY u.name`,
    )
    .all() as unknown as CohortRow[];
  return rows;
}

export function studentDetail(user: SessionUser) {
  return {
    user,
    progress: progressFor(user.id),
    attempts: attemptsFor(user.id),
  };
}
