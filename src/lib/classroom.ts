import { randomInt } from 'node:crypto';
import { db } from './db';
import { loadModules } from './curriculum';
import type { Status } from './progress';

/*
 * Classes, enrolment, and assignments — the teacher's roster layer. A class is
 * a named group of students with a join code; assignments hang off a class and
 * name a module plus an optional due date. Everything here is scoped to the
 * owning teacher, and the routes enforce that; these functions take the ids and
 * do the work, so a caller that skips the ownership check cannot read another
 * teacher's roster by accident.
 */

export interface ClassRow {
  id: number;
  name: string;
  teacher_id: number;
  join_code: string;
  created_at: string;
}

/* Ambiguous glyphs (I/O/0/1) are left out so a code survives being read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function freshCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `DZ-${out}`;
}

export function classById(id: number): ClassRow | undefined {
  return db().prepare('SELECT * FROM classes WHERE id = ?').get(id) as ClassRow | undefined;
}

/* Ownership is the teacher-authorization check for every class sub-resource. */
export function ownedClass(teacherId: number, classId: number): ClassRow | undefined {
  const row = classById(classId);
  return row && row.teacher_id === teacherId ? row : undefined;
}

export function createClass(teacherId: number, name: string): ClassRow {
  const trimmed = name.trim().slice(0, 120) || 'Untitled class';
  /* The code space is large, but a collision would still be a bad way to fail. */
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const info = db()
        .prepare('INSERT INTO classes (name, teacher_id, join_code) VALUES (?, ?, ?)')
        .run(trimmed, teacherId, freshCode());
      return classById(Number(info.lastInsertRowid))!;
    } catch {
      /* UNIQUE violation on join_code — allocate another and retry. */
    }
  }
  throw new Error('could not allocate a join code');
}

export interface ClassWithCounts extends ClassRow {
  students: number;
  assignments: number;
}

export function classesForTeacher(teacherId: number): ClassWithCounts[] {
  return db()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS students,
              (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id) AS assignments
         FROM classes c
        WHERE c.teacher_id = ?
        ORDER BY c.created_at DESC`,
    )
    .all(teacherId) as unknown as ClassWithCounts[];
}

export interface StudentClass extends ClassRow {
  teacher_name: string;
}

export function classesForStudent(studentId: number): StudentClass[] {
  return db()
    .prepare(
      `SELECT c.*, u.name AS teacher_name
         FROM classes c
         JOIN users u ON u.id = c.teacher_id
         JOIN enrollments e ON e.class_id = c.id
        WHERE e.student_id = ?
        ORDER BY c.created_at DESC`,
    )
    .all(studentId) as unknown as StudentClass[];
}

export function deleteClass(teacherId: number, classId: number): boolean {
  const info = db().prepare('DELETE FROM classes WHERE id = ? AND teacher_id = ?').run(classId, teacherId);
  return Number(info.changes) > 0;
}

export function renameClass(teacherId: number, classId: number, name: string): ClassRow | undefined {
  if (!ownedClass(teacherId, classId)) return undefined;
  db().prepare('UPDATE classes SET name = ? WHERE id = ?').run(name.trim().slice(0, 120) || 'Untitled class', classId);
  return classById(classId);
}

export function rotateJoinCode(teacherId: number, classId: number): ClassRow | undefined {
  if (!ownedClass(teacherId, classId)) return undefined;
  db().prepare('UPDATE classes SET join_code = ? WHERE id = ?').run(freshCode(), classId);
  return classById(classId);
}

/* ---------- enrolment ---------- */

export function enrollByCode(studentId: number, code: string): ClassRow {
  const row = db()
    .prepare('SELECT * FROM classes WHERE join_code = ?')
    .get(code.trim().toUpperCase()) as ClassRow | undefined;
  if (!row) throw new Error('NO_SUCH_CLASS');
  /* Idempotent: joining twice is not an error, it just stays enrolled once. */
  db()
    .prepare('INSERT OR IGNORE INTO enrollments (class_id, student_id) VALUES (?, ?)')
    .run(row.id, studentId);
  return row;
}

export interface ClassStudent {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

export function roster(classId: number): ClassStudent[] {
  return db()
    .prepare(
      `SELECT u.id, u.name, u.email, e.created_at AS joined_at
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
        WHERE e.class_id = ?
        ORDER BY u.name`,
    )
    .all(classId) as unknown as ClassStudent[];
}

/* ---------- assignments ---------- */

export interface AssignmentRow {
  id: number;
  class_id: number;
  module_id: string;
  due_at: string | null;
  created_at: string;
}

export function listAssignments(classId: number): AssignmentRow[] {
  return db()
    .prepare('SELECT * FROM assignments WHERE class_id = ? ORDER BY created_at')
    .all(classId) as unknown as AssignmentRow[];
}

/* Store a comparable "YYYY-MM-DD HH:MM:SS" string: a bare date means the end of
 * that day, so work due today is not flagged overdue at 00:01. */
function normalizeDue(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(input.trim());
  if (!m) return null;
  return `${m[1]} ${m[2] ? `${m[2]}:00` : '23:59:59'}`;
}

export function assignModule(
  teacherId: number,
  classId: number,
  moduleId: string,
  dueAt: string | null,
): AssignmentRow | undefined {
  if (!ownedClass(teacherId, classId)) return undefined;
  db()
    .prepare(
      `INSERT INTO assignments (class_id, module_id, due_at) VALUES (?, ?, ?)
       ON CONFLICT(class_id, module_id) DO UPDATE SET due_at = excluded.due_at`,
    )
    .run(classId, moduleId, normalizeDue(dueAt));
  return db()
    .prepare('SELECT * FROM assignments WHERE class_id = ? AND module_id = ?')
    .get(classId, moduleId) as unknown as AssignmentRow;
}

export function unassignModule(teacherId: number, classId: number, moduleId: string): boolean {
  if (!ownedClass(teacherId, classId)) return false;
  const info = db()
    .prepare('DELETE FROM assignments WHERE class_id = ? AND module_id = ?')
    .run(classId, moduleId);
  return Number(info.changes) > 0;
}

/* ---------- the student's view of assigned work ---------- */

export interface StudentAssignment {
  class_id: number;
  class_name: string;
  module_id: string;
  due_at: string | null;
  status: Status | null;
  best_score: number | null;
  best_total: number | null;
}

export function assignmentsForStudent(studentId: number): StudentAssignment[] {
  const rows = db()
    .prepare(
      `SELECT c.id AS class_id, c.name AS class_name, a.module_id, a.due_at
         FROM assignments a
         JOIN classes c ON c.id = a.class_id
         JOIN enrollments e ON e.class_id = c.id AND e.student_id = ?
        ORDER BY (a.due_at IS NULL), a.due_at, a.module_id`,
    )
    .all(studentId) as unknown as {
    class_id: number;
    class_name: string;
    module_id: string;
    due_at: string | null;
  }[];

  const status = new Map<string, Status>();
  for (const p of db()
    .prepare('SELECT module_id, status FROM progress WHERE user_id = ?')
    .all(studentId) as unknown as { module_id: string; status: Status }[]) {
    status.set(p.module_id, p.status);
  }

  /* Best attempt per module, reduced here rather than in SQL. */
  const best = new Map<string, { score: number; total: number }>();
  for (const a of db()
    .prepare('SELECT module_id, score, total FROM quiz_attempts WHERE user_id = ?')
    .all(studentId) as unknown as { module_id: string; score: number; total: number }[]) {
    const cur = best.get(a.module_id);
    if (!cur || a.score / a.total > cur.score / cur.total) best.set(a.module_id, { score: a.score, total: a.total });
  }

  return rows.map((r) => {
    const b = best.get(r.module_id);
    return {
      ...r,
      status: status.get(r.module_id) ?? null,
      best_score: b?.score ?? null,
      best_total: b?.total ?? null,
    };
  });
}

/* ---------- gradebook ---------- */

export interface GradeCell {
  status: Status | null;
  score: number | null;
  total: number | null;
}

export interface GradeRow {
  student: ClassStudent;
  cells: Record<string, GradeCell>;
  passed: number;
  average: number | null;
  /* Assigned modules whose due date has passed without a pass — the at-risk signal. */
  overdue: string[];
  lastActive: string | null;
}

export interface Gradebook {
  modules: string[];
  rows: GradeRow[];
}

export function gradebook(classId: number): Gradebook {
  const dueByModule = new Map<string, string | null>();
  for (const a of listAssignments(classId)) dueByModule.set(a.module_id, a.due_at);

  /* Columns in curriculum order, so the grid reads like the syllabus. */
  const order = new Map(loadModules().map((m) => [m.id, m.order]));
  const modules = [...dueByModule.keys()].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));

  const students = roster(classId);
  /* SQLite datetime() is UTC, so compare against a UTC "now" in the same shape. */
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const progress = db()
    .prepare(
      `SELECT p.user_id AS student_id, p.module_id, p.status, p.updated_at
         FROM progress p
         JOIN enrollments e ON e.student_id = p.user_id
        WHERE e.class_id = ?`,
    )
    .all(classId) as unknown as {
    student_id: number;
    module_id: string;
    status: Status;
    updated_at: string;
  }[];

  const attempts = db()
    .prepare(
      `SELECT q.user_id AS student_id, q.module_id, q.score, q.total
         FROM quiz_attempts q
         JOIN enrollments e ON e.student_id = q.user_id
        WHERE e.class_id = ?`,
    )
    .all(classId) as unknown as { student_id: number; module_id: string; score: number; total: number }[];

  const statusOf = new Map<string, Status>();
  const lastActive = new Map<number, string>();
  for (const p of progress) {
    statusOf.set(`${p.student_id}:${p.module_id}`, p.status);
    const prev = lastActive.get(p.student_id);
    if (!prev || p.updated_at > prev) lastActive.set(p.student_id, p.updated_at);
  }

  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const key = `${a.student_id}:${a.module_id}`;
    const cur = best.get(key);
    if (!cur || a.score / a.total > cur.score / cur.total) best.set(key, { score: a.score, total: a.total });
  }

  const rows: GradeRow[] = students.map((student) => {
    const cells: Record<string, GradeCell> = {};
    const scores: number[] = [];
    const overdue: string[] = [];
    let passed = 0;

    for (const moduleId of modules) {
      const key = `${student.id}:${moduleId}`;
      const status = statusOf.get(key) ?? null;
      const attempt = best.get(key);
      cells[moduleId] = { status, score: attempt?.score ?? null, total: attempt?.total ?? null };

      if (status === 'assessment-passed') passed++;
      if (attempt) scores.push(attempt.score / attempt.total);

      const due = dueByModule.get(moduleId) ?? null;
      if (due && status !== 'assessment-passed' && due < now) overdue.push(moduleId);
    }

    return {
      student,
      cells,
      passed,
      average: scores.length ? Math.round((scores.reduce((n, x) => n + x, 0) / scores.length) * 100) : null,
      overdue,
      lastActive: lastActive.get(student.id) ?? null,
    };
  });

  return { modules, rows };
}

/* ---------- CSV export ---------- */

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function classCsv(classId: number): string | null {
  if (!classById(classId)) return null;
  const gb = gradebook(classId);
  const titles = new Map(loadModules().map((m) => [m.id, `${String(m.order).padStart(2, '0')} ${m.title}`]));

  const header = [
    'Student',
    'Email',
    ...gb.modules.map((id) => titles.get(id) ?? id),
    'Passed',
    'Average',
    'Last active',
  ];

  const body = gb.rows.map((row) => [
    row.student.name,
    row.student.email,
    ...gb.modules.map((id) => {
      const cell = row.cells[id];
      if (!cell) return '';
      const label =
        cell.status === 'assessment-passed'
          ? 'passed'
          : cell.status === 'lab-complete'
            ? 'lab done'
            : cell.status === 'engaged'
              ? 'engaged'
              : 'not started';
      return cell.score === null || cell.total === null ? label : `${label} ${cell.score}/${cell.total}`;
    }),
    String(row.passed),
    row.average === null ? '' : `${row.average}%`,
    row.lastActive ?? '',
  ]);

  return [header, ...body].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}
