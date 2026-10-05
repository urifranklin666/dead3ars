/*
 * The seed cohort. Demo credentials, intentionally obvious and printed by the
 * seed script. Change them before this is used by anyone real.
 */
import { db } from '../src/lib/db';
import { createUser } from '../src/lib/auth';
import { loadModules } from '../src/lib/curriculum';
import { recordAttempt, recordProgress } from '../src/lib/progress';
import { assignModule, classesForTeacher, createClass, enrollByCode, listAssignments, recordGrade, setRubric, submitWork } from '../src/lib/classroom';

const PEOPLE = [
  { email: 'teacher@dead3ars.test', name: 'Dr. A. Teacher', password: 'teacher-pass-2026', role: 'teacher' as const },
  { email: 'ada@dead3ars.test', name: 'Ada Student', password: 'student-pass-2026', role: 'student' as const },
  { email: 'grace@dead3ars.test', name: 'Grace Student', password: 'student-pass-2026', role: 'student' as const },
  { email: 'linus@dead3ars.test', name: 'Linus Student', password: 'student-pass-2026', role: 'student' as const },
  { email: 'admin@dead3ars.test', name: 'Instance Admin', password: 'admin-pass-2026', role: 'admin' as const },
];

const users: Record<string, number> = {};

for (const p of PEOPLE) {
  try {
    const u = createUser(p);
    users[p.email] = u.id;
    console.log(`created ${p.role.padEnd(7)} ${p.email}  (password: ${p.password})`);
  } catch {
    const existing = db().prepare('SELECT id FROM users WHERE email = ?').get(p.email) as { id: number };
    users[p.email] = existing.id;
    console.log(`exists  ${p.role.padEnd(7)} ${p.email}`);
  }
}

const mods = loadModules();
console.log(`\ncurriculum: ${mods.length} modules loaded`);
if (mods.length === 0) {
  console.log('  (content/modules is empty - nothing to seed progress against)');
}

/*
 * Give the demo students different amounts of progress so the teacher dashboard
 * has something real to distinguish.
 */
function seedProgress(email: string, upto: number, passEvery: number) {
  const id = users[email];
  const slice = mods.slice(0, upto);
  for (const [i, m] of slice.entries()) {
    recordProgress(id, m.id, i % passEvery === 0 ? 'assessment-passed' : 'lab-complete');
    if (i % passEvery === 0) recordAttempt(id, m.id, m.assessment.length, m.assessment.length, []);
    else recordAttempt(id, m.id, m.assessment.length - 1, m.assessment.length, []);
  }
  console.log(`seeded ${slice.length} module(s) of progress for ${email}`);
}

if (mods.length) {
  seedProgress('ada@dead3ars.test', mods.length, 2); // furthest along
  seedProgress('grace@dead3ars.test', Math.ceil(mods.length / 2), 3);
  seedProgress('linus@dead3ars.test', 1, 9);
}

/*
 * A demo class so the roster, gradebook, and assignment views have something
 * real to show. Modules 1–4 are assigned with staggered due dates: some past
 * (so a student can show up at-risk) and some ahead.
 */
const teacherId = users['teacher@dead3ars.test'];
if (teacherId && mods.length) {
  /* Look the demo class up by name, not by recency — a smoke-test class created
   * since the last seed would otherwise be picked up and seeded instead. */
  const DEMO = 'CS 4700 — Offensive Security';
  let klass: { id: number; name: string; join_code: string } | undefined = classesForTeacher(teacherId).find(
    (c) => c.name === DEMO,
  );
  if (!klass) {
    klass = createClass(teacherId, DEMO);
    console.log(`created class "${klass.name}"  (join code: ${klass.join_code})`);
  } else {
    console.log(`exists  class "${klass.name}"  (join code: ${klass.join_code})`);
  }

  for (const email of ['ada@dead3ars.test', 'grace@dead3ars.test', 'linus@dead3ars.test']) {
    enrollByCode(users[email], klass.join_code);
  }

  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);
  const dueDates = [iso(-21), iso(-10), iso(4), iso(11)];
  mods.slice(0, dueDates.length).forEach((m, i) => assignModule(teacherId, klass!.id, m.id, dueDates[i]));
  console.log(`assigned ${Math.min(dueDates.length, mods.length)} module(s) to "${klass.name}"`);

  /* A graded submission and an ungraded one, so both grading states are visible. */
  const assignments = listAssignments(klass.id);
  const rubric = [
    { name: 'Technical accuracy', description: 'Findings are correct and reproducible.', points: 40 },
    { name: 'Evidence quality', description: 'Screenshots or output back each claim.', points: 30 },
    { name: 'Defensive insight', description: 'Names the control that would stop it.', points: 30 },
  ];
  if (assignments[0]) {
    setRubric(assignments[0].id, rubric);
    submitWork(
      assignments[0].id,
      users['ada@dead3ars.test'],
      'Ran the lab end to end. Recon surfaced the legacy admin endpoint, which still accepted\n' +
        'the default credential from the module. Log attached in the linked gist.',
      'https://gist.github.com/example/ada-m01',
    );
    recordGrade(assignments[0].id, users['ada@dead3ars.test'], 88, 100, 'Thorough write-up. Watch the length — lead with the finding.');
    console.log('seeded a graded submission for ada on the first assignment');
  }
  if (assignments[1]) {
    setRubric(assignments[1].id, rubric);
    submitWork(
      assignments[1].id,
      users['grace@dead3ars.test'],
      'Partial write-up submitted; still collecting evidence for the second half.',
      '',
    );
    console.log('seeded an ungraded submission for grace');
  }
}

console.log('\ndone.');
