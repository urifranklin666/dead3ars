import { randomInt } from 'node:crypto';
import { db, findUserByEmail } from './db';
import { createUser } from './auth';
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
export function normalizeDue(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(input.trim());
  if (!m) return null;
  return `${m[1]} ${m[2] ? `${m[2]}:00` : '23:59:59'}`;
}

export function setAssignmentDue(assignmentId: number, dueAt: string | null | undefined): AssignmentRow | undefined {
  db().prepare('UPDATE assignments SET due_at = ? WHERE id = ?').run(normalizeDue(dueAt), assignmentId);
  return assignmentById(assignmentId);
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

/* ---------- classwork: submissions, rubrics, and grades ---------- */

export interface SubmissionRow {
  id: number;
  assignment_id: number;
  student_id: number;
  body: string;
  link: string;
  submitted_at: string;
  updated_at: string;
}

export interface GradeRowEntry {
  assignment_id: number;
  student_id: number;
  score: number;
  max: number;
  feedback: string;
  graded_at: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
}

export function assignmentById(id: number): AssignmentRow | undefined {
  return db().prepare('SELECT * FROM assignments WHERE id = ?').get(id) as unknown as AssignmentRow | undefined;
}

/* An assignment is reachable if its owning class belongs to `teacherId`. */
export function ownedAssignment(teacherId: number, assignmentId: number): AssignmentRow | undefined {
  const a = assignmentById(assignmentId);
  return a && ownedClass(teacherId, a.class_id) ? a : undefined;
}

/* An assignment is visible to a student iff they are enrolled in its class. */
export function studentAssignment(studentId: number, assignmentId: number): AssignmentRow | undefined {
  const row = db()
    .prepare(
      `SELECT a.* FROM assignments a
         JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = ?
        WHERE a.id = ?`,
    )
    .get(studentId, assignmentId) as unknown as AssignmentRow | undefined;
  return row;
}

function parseRubric(raw: string): RubricCriterion[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is RubricCriterion => typeof c === 'object' && c !== null)
      .map((c) => ({
        name: String((c as RubricCriterion).name ?? '').slice(0, 120),
        description: String((c as RubricCriterion).description ?? '').slice(0, 500),
        points: Math.max(0, Math.round(Number((c as RubricCriterion).points) || 0)),
      }))
      .filter((c) => c.name !== '');
  } catch {
    return [];
  }
}

export function getRubric(assignmentId: number): RubricCriterion[] {
  const row = db().prepare('SELECT criteria FROM rubrics WHERE assignment_id = ?').get(assignmentId) as
    | { criteria: string }
    | undefined;
  return row ? parseRubric(row.criteria) : [];
}

export function setRubric(assignmentId: number, criteria: RubricCriterion[]): RubricCriterion[] {
  const cleaned = criteria.slice(0, 20).map((c) => ({
    name: c.name.slice(0, 120),
    description: c.description.slice(0, 500),
    points: Math.max(0, Math.round(c.points) || 0),
  }));
  db()
    .prepare(
      `INSERT INTO rubrics (assignment_id, criteria) VALUES (?, ?)
       ON CONFLICT(assignment_id) DO UPDATE SET criteria = excluded.criteria`,
    )
    .run(assignmentId, JSON.stringify(cleaned));
  return cleaned;
}

export function submitWork(
  assignmentId: number,
  studentId: number,
  body: string,
  link: string,
): SubmissionRow {
  db()
    .prepare(
      `INSERT INTO submissions (assignment_id, student_id, body, link, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(assignment_id, student_id)
       DO UPDATE SET body = excluded.body, link = excluded.link, updated_at = excluded.updated_at`,
    )
    .run(assignmentId, studentId, body.slice(0, 20000), link.trim().slice(0, 500));
  return db()
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, studentId) as unknown as SubmissionRow;
}

export function submissionFor(assignmentId: number, studentId: number): SubmissionRow | undefined {
  return db()
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, studentId) as unknown as SubmissionRow | undefined;
}

export function gradeFor(assignmentId: number, studentId: number): GradeRowEntry | undefined {
  return db()
    .prepare('SELECT * FROM grades WHERE assignment_id = ? AND student_id = ?')
    .get(assignmentId, studentId) as unknown as GradeRowEntry | undefined;
}

export function recordGrade(
  assignmentId: number,
  studentId: number,
  score: number,
  max: number,
  feedback: string,
): GradeRowEntry {
  db()
    .prepare(
      `INSERT INTO grades (assignment_id, student_id, score, max, feedback, graded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(assignment_id, student_id)
       DO UPDATE SET score = excluded.score, max = excluded.max, feedback = excluded.feedback, graded_at = excluded.graded_at`,
    )
    .run(assignmentId, studentId, Math.max(0, Math.round(score)), Math.max(1, Math.round(max)), feedback.slice(0, 4000));
  return gradeFor(assignmentId, studentId)!;
}

export function deleteGrade(assignmentId: number, studentId: number): boolean {
  const info = db()
    .prepare('DELETE FROM grades WHERE assignment_id = ? AND student_id = ?')
    .run(assignmentId, studentId);
  return Number(info.changes) > 0;
}

export interface WorkRow {
  student: ClassStudent;
  submission: SubmissionRow | null;
  grade: GradeRowEntry | null;
}

/* The teacher's grading view of one assignment: every enrolled student, with
 * their submission and grade if any. Absent work is a row, not a gap. */
export function assignmentWork(assignmentId: number): WorkRow[] {
  const a = assignmentById(assignmentId);
  if (!a) return [];
  const submissions = new Map<number, SubmissionRow>();
  for (const s of db()
    .prepare('SELECT * FROM submissions WHERE assignment_id = ?')
    .all(assignmentId) as unknown as SubmissionRow[]) {
    submissions.set(s.student_id, s);
  }
  const grades = new Map<number, GradeRowEntry>();
  for (const g of db()
    .prepare('SELECT * FROM grades WHERE assignment_id = ?')
    .all(assignmentId) as unknown as GradeRowEntry[]) {
    grades.set(g.student_id, g);
  }
  return roster(a.class_id).map((student) => ({
    student,
    submission: submissions.get(student.id) ?? null,
    grade: grades.get(student.id) ?? null,
  }));
}

/* A student's own work and marks, for their dashboard and the module page. */
export interface StudentWork extends StudentAssignment {
  assignment_id: number;
  body: string | null;
  link: string | null;
  submitted_at: string | null;
  score: number | null;
  max: number | null;
  feedback: string | null;
  graded_at: string | null;
}

export function workForStudent(studentId: number, moduleId?: string): StudentWork[] {
  const rows = db()
    .prepare(
      `SELECT a.id AS assignment_id, c.id AS class_id, c.name AS class_name, a.module_id, a.due_at,
              s.body, s.link, s.submitted_at, g.score, g.max, g.feedback, g.graded_at
         FROM assignments a
         JOIN classes c ON c.id = a.class_id
         JOIN enrollments e ON e.class_id = c.id AND e.student_id = ?
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
         LEFT JOIN grades g ON g.assignment_id = a.id AND g.student_id = e.student_id
        WHERE (? IS NULL OR a.module_id = ?)
        ORDER BY (a.due_at IS NULL), a.due_at, a.module_id`,
    )
    .all(studentId, moduleId ?? null, moduleId ?? null) as unknown as {
    assignment_id: number;
    class_id: number;
    class_name: string;
    module_id: string;
    due_at: string | null;
    body: string | null;
    link: string | null;
    submitted_at: string | null;
    score: number | null;
    max: number | null;
    feedback: string | null;
    graded_at: string | null;
  }[];

  const status = new Map<string, Status>();
  for (const p of db()
    .prepare('SELECT module_id, status FROM progress WHERE user_id = ?')
    .all(studentId) as unknown as { module_id: string; status: Status }[]) {
    status.set(p.module_id, p.status);
  }

  const best = new Map<string, { score: number; total: number }>();
  for (const a of db()
    .prepare('SELECT module_id, score, total FROM quiz_attempts WHERE user_id = ?')
    .all(studentId) as unknown as { module_id: string; score: number; total: number }[]) {
    const cur = best.get(a.module_id);
    if (!cur || a.score / a.total > cur.score / cur.total) best.set(a.module_id, { score: a.score, total: a.total });
  }

  return rows.map((r) => ({
    ...r,
    status: status.get(r.module_id) ?? null,
    best_score: best.get(r.module_id)?.score ?? null,
    best_total: best.get(r.module_id)?.total ?? null,
  }));
}

/* ---------- announcements and class discussion ---------- */

export interface AnnouncementRow {
  id: number;
  class_id: number;
  author_id: number;
  title: string;
  body: string;
  created_at: string;
}

export interface Announcement extends AnnouncementRow {
  author_name: string;
}

export function listAnnouncements(classId: number): Announcement[] {
  return db()
    .prepare(
      `SELECT a.*, u.name AS author_name
         FROM announcements a
         JOIN users u ON u.id = a.author_id
        WHERE a.class_id = ?
        ORDER BY a.created_at DESC, a.id DESC`,
    )
    .all(classId) as unknown as Announcement[];
}

export function postAnnouncement(classId: number, authorId: number, title: string, body: string): Announcement {
  const info = db()
    .prepare('INSERT INTO announcements (class_id, author_id, title, body) VALUES (?, ?, ?, ?)')
    .run(classId, authorId, title.trim().slice(0, 200), body.slice(0, 20000));
  return db()
    .prepare(
      `SELECT a.*, u.name AS author_name
         FROM announcements a JOIN users u ON u.id = a.author_id
        WHERE a.id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as unknown as Announcement;
}

export function deleteAnnouncement(teacherId: number, id: number): boolean {
  const row = db().prepare('SELECT class_id FROM announcements WHERE id = ?').get(id) as
    | { class_id: number }
    | undefined;
  if (!row || !ownedClass(teacherId, row.class_id)) return false;
  const info = db().prepare('DELETE FROM announcements WHERE id = ?').run(id);
  return Number(info.changes) > 0;
}

export interface DiscussionPost extends DiscussionRow {
  author_name: string;
  author_role: string;
  replies: DiscussionPost[];
}

interface DiscussionRow {
  id: number;
  class_id: number;
  author_id: number;
  parent_id: number | null;
  body: string;
  created_at: string;
}

/* Threads oldest-first with replies nested, so the conversation reads top to
 * bottom. Ordering is by creation, not id, so an edited row keeps its place. */
export function listDiscussion(classId: number): DiscussionPost[] {
  const rows = db()
    .prepare(
      `SELECT d.*, u.name AS author_name, u.role AS author_role
         FROM discussions d
         JOIN users u ON u.id = d.author_id
        WHERE d.class_id = ?
        ORDER BY d.created_at, d.id`,
    )
    .all(classId) as unknown as DiscussionPost[];

  const byId = new Map<number, DiscussionPost>();
  for (const r of rows) byId.set(r.id, { ...r, replies: [] });

  const roots: DiscussionPost[] = [];
  for (const r of rows) {
    const post = byId.get(r.id)!;
    if (r.parent_id !== null) byId.get(r.parent_id)?.replies.push(post);
    else roots.push(post);
  }
  return roots;
}

export function postDiscussion(
  classId: number,
  authorId: number,
  body: string,
  parentId: number | null,
): DiscussionRow {
  /* A reply must point at a thread in the same class. */
  if (parentId !== null) {
    const parent = db().prepare('SELECT class_id FROM discussions WHERE id = ?').get(parentId) as
      | { class_id: number }
      | undefined;
    if (!parent || parent.class_id !== classId) throw new Error('BAD_PARENT');
  }
  const info = db()
    .prepare('INSERT INTO discussions (class_id, author_id, parent_id, body) VALUES (?, ?, ?, ?)')
    .run(classId, authorId, parentId, body.slice(0, 8000));
  return db()
    .prepare('SELECT * FROM discussions WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as unknown as DiscussionRow;
}

export function deleteDiscussionPost(id: number): boolean {
  const info = db().prepare('DELETE FROM discussions WHERE id = ?').run(id);
  return Number(info.changes) > 0;
}

/* Whether a student is enrolled, or a teacher owns, this class — the single
 * gate for a class's community surfaces. */
export function canSeeClass(userId: number, role: string, classId: number): boolean {
  const k = classById(classId);
  if (!k) return false;
  if (k.teacher_id === userId) return true;
  if (role === 'admin') return true;
  const member = db()
    .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?')
    .get(classId, userId);
  return member !== undefined;
}

/* ---------- roster import ---------- */

export interface ParsedRoster {
  rows: { name: string; email: string }[];
  skipped: { line: number; reason: string }[];
}

/* Parse a roster CSV. Accepts a "name,email" or "email,name" header, or bare
 * rows, so a teacher can paste whatever their SIS exported. Quoted fields and
 * embedded commas are handled; anything without a plausible email is skipped
 * with a reason, so one bad line does not fail the whole import. */
export function parseRosterCsv(text: string): ParsedRoster {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { rows: [], skipped: [] };

  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  let start = 0;
  let emailFirst = false;
  const first = split(lines[0]);
  const lower = first.map((s) => s.toLowerCase());
  if (lower.some((s) => s === 'email' || s === 'e-mail' || s === 'mail')) {
    emailFirst = lower[0] !== 'name';
    start = 1;
  }

  const rows: { name: string; email: string }[] = [];
  const skipped: { line: number; reason: string }[] = [];
  for (let i = start; i < lines.length; i++) {
    const fields = split(lines[i]);
    let email = '';
    let name = '';
    if (emailFirst) {
      email = fields[0] ?? '';
      name = fields[1] ?? '';
    } else if (isEmail(fields[1] ?? '')) {
      name = fields[0] ?? '';
      email = fields[1] ?? '';
    } else {
      email = fields[0] ?? '';
      name = fields[1] ?? '';
    }
    email = email.trim();
    name = name.trim();

    if (!isEmail(email)) {
      skipped.push({ line: i + 1, reason: `no valid email in "${lines[i].slice(0, 40)}"` });
      continue;
    }
    if (!name) name = email.split('@')[0];
    rows.push({ name: name.slice(0, 120), email });
  }

  /* De-duplicate by email, keeping the first occurrence. */
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { rows: unique, skipped };
}

export interface ImportResult {
  created: number;
  enrolled: number;
  existing: number;
  skipped: { line: number; reason: string }[];
}

/* Create accounts for a parsed roster and enrol them. An email that already has
 * an account is enrolled rather than recreated — a teacher re-running an import
 * after adding one line must not fail on the students already present. */
export function importRoster(
  teacherId: number,
  classId: number,
  rows: { name: string; email: string }[],
  skipped: { line: number; reason: string }[],
  makePassword: () => string,
): ImportResult & { passwords: { email: string; password: string }[] } {
  const klass = ownedClass(teacherId, classId);
  if (!klass) return { created: 0, enrolled: 0, existing: 0, skipped, passwords: [] };

  const passwords: { email: string; password: string }[] = [];
  let created = 0;
  let enrolled = 0;
  let existing = 0;

  for (const row of rows) {
    let userId: number;
    const found = findUserByEmail(row.email);
    if (found) {
      userId = found.id;
      existing++;
    } else {
      const password = makePassword();
      const user = createUser({ name: row.name, email: row.email, password, role: 'student' });
      userId = user.id;
      passwords.push({ email: row.email, password });
      created++;
    }
    const info = db()
      .prepare('INSERT OR IGNORE INTO enrollments (class_id, student_id) VALUES (?, ?)')
      .run(classId, userId);
    if (Number(info.changes) > 0) enrolled++;
  }

  return { created, enrolled, existing, skipped, passwords };
}

/* ---------- per-class analytics ---------- */
export interface ModuleAnalytic {
  module_id: string;
  students: number;
  passed: number;
  started: number;
  average: number | null;
  overdue: number;
}

export function classAnalytics(classId: number): ModuleAnalytic[] {
  const gb = gradebook(classId);
  const order = new Map(loadModules().map((m) => [m.id, m.order]));
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const out: ModuleAnalytic[] = gb.modules.map((id) => {
    let students = 0;
    let passed = 0;
    let started = 0;
    let overdue = 0;
    const scores: number[] = [];
    for (const row of gb.rows) {
      const cell = row.cells[id];
      if (!cell) continue;
      students++;
      if (cell.status !== null) started++;
      if (cell.status === 'assessment-passed') passed++;
      if (cell.score !== null && cell.total !== null && cell.total > 0) scores.push(cell.score / cell.total);
      if (row.overdue.includes(id) && now) overdue++;
    }
    return {
      module_id: id,
      students,
      passed,
      started,
      average: scores.length ? Math.round((scores.reduce((n, x) => n + x, 0) / scores.length) * 100) : null,
      overdue,
    };
  });

  return out.sort((a, b) => (order.get(a.module_id) ?? 1e9) - (order.get(b.module_id) ?? 1e9));
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
