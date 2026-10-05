import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/*
 * Single SQLite file, using Node's built-in node:sqlite (no native build step).
 * Cached on globalThis so Next's dev-mode module reloading does not reopen it.
 */

const DB_PATH = process.env.DZ_DB ?? resolve(process.cwd(), 'data', 'dead3ars.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id  TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('engaged','lab-complete','assessment-passed')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, module_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id  TEXT NOT NULL,
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  answers    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id  TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, module_id)
);

/* A class is a teacher's roster: a named group of students with a join code.
 * Assignments hang off a class and name a module and an optional due date. The
 * schema is additive (CREATE TABLE IF NOT EXISTS), so an older database picks
 * these up on next open without a migration step. */
CREATE TABLE IF NOT EXISTS classes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_code  TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  module_id  TEXT NOT NULL,
  due_at     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, module_id)
);

/* Classwork: a submission is a student's written answer plus an optional link
 * (a repo, a screenshot host, a writeup). A grade is the teacher's score and
 * feedback on that submission. A rubric is the assignment's criteria list,
 * stored as JSON. One row per student per assignment, replaced on resubmit. */
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL DEFAULT '',
  link          TEXT NOT NULL DEFAULT '',
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL,
  max           INTEGER NOT NULL,
  feedback      TEXT NOT NULL DEFAULT '',
  graded_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS rubrics (
  assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
  criteria      TEXT NOT NULL DEFAULT '[]'
);

/* Class community: announcements a teacher posts to a class, and a discussion
 * where anyone with access to the class can post. A discussion row with a
 * parent_id is a reply; without one it starts a thread. */
CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discussions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

/* An append-only trail of who did what to whom. actor_id is ON DELETE SET NULL
 * so the history survives the account being removed — the row is the record. */
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id   TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assignment ON grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class ON announcements(class_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discussions_class ON discussions(class_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
`;

const g = globalThis as unknown as { __dzDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__dzDb) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const handle = new DatabaseSync(DB_PATH);
    handle.exec('PRAGMA journal_mode = WAL;');
    handle.exec('PRAGMA foreign_keys = ON;');
    handle.exec(SCHEMA);
    g.__dzDb = handle;
  }
  return g.__dzDb;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  password_hash: string;
  created_at: string;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return db().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function listUsers(role?: string): UserRow[] {
  const q = role
    ? db().prepare('SELECT * FROM users WHERE role = ? ORDER BY name').all(role)
    : db().prepare('SELECT * FROM users ORDER BY role, name').all();
  return q as unknown as UserRow[];
}

export function userCountsByRole(): Record<string, number> {
  const rows = db().prepare('SELECT role, COUNT(*) AS n FROM users GROUP BY role').all() as unknown as {
    role: string;
    n: number;
  }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.role] = r.n;
  return out;
}

/* Role is the one mutable field on a user; email and password are not edited
 * here. Callers must be admins (the route enforces it). */
export function setUserRole(id: number, role: UserRow['role']): UserRow | undefined {
  const info = db().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return Number(info.changes) > 0 ? findUserById(id) : undefined;
}
