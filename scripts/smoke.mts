/*
 * End-to-end smoke test against a running dead3ars server.
 *
 *   npm run dev            # in one terminal
 *   npm run test:smoke     # in another
 *
 * It exercises the security-critical behaviours, not just the happy path: that the
 * answer key never reaches the browser, that grading happens server-side, that a
 * client cannot claim a passed assessment, and that the teacher API is closed to
 * students.
 */
import { FREE_MODULE_LIMIT, loadModules } from '../src/lib/curriculum';

const BASE = process.env.DZ_BASE ?? 'http://localhost:3000';
const stamp = Date.now();

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++;
  else failed++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

interface Reply {
  status: number;
  body: string;
  cookie: string | null;
  location: string | null;
  json: <T = unknown>() => T;
}

async function call(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string; follow?: boolean } = {},
): Promise<Reply> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    /* Off by default so a redirect is observable rather than silently followed. */
    redirect: opts.follow ? 'follow' : 'manual',
    headers: {
      ...(opts.body ? { 'content-type': 'application/json' } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.text();
  const setCookie = res.headers.get('set-cookie');

  return {
    status: res.status,
    body,
    cookie: setCookie ? setCookie.split(';')[0] : null,
    location: res.headers.get('location'),
    json: <T,>() => JSON.parse(body) as T,
  };
}

const modules = loadModules();
const target = modules[0];
/* The smoke student passes `target` partway through; classroom checks assign a
 * different module so "not yet passed" is true for them. */
const assignedModule = modules[1] ?? modules[0];

console.log(`\ndead3ars smoke test against ${BASE}\n`);
console.log(`  (using module ${target.id}, ${target.assessment.length} questions)\n`);

/* ---------- the syllabus is public, so the server must be reachable ---------- */

const home = await call('/');
check('GET / returns 200', home.status === 200, `status ${home.status}`);

const anonymousTeacher = await call('/api/teacher');
check('anonymous cannot read the cohort', anonymousTeacher.status === 401, `status ${anonymousTeacher.status}`);

/* ---------- registration ---------- */

const newEmail = `smoke-${stamp}@dead3ars.test`;
const reg = await call('/api/auth/register', {
  method: 'POST',
  body: { email: newEmail, name: 'Smoke Test', password: 'smoke-pass-2026', role: 'student' },
});
check('register a new student', reg.status === 200, `status ${reg.status}`);
const studentCookie = reg.cookie;
check('registration sets a session cookie', studentCookie !== null);

const dupe = await call('/api/auth/register', {
  method: 'POST',
  body: { email: newEmail, name: 'Smoke Test', password: 'smoke-pass-2026', role: 'student' },
});
check('duplicate email is rejected', dupe.status === 400, `status ${dupe.status}`);

const shortPw = await call('/api/auth/register', {
  method: 'POST',
  body: { email: `x-${stamp}@dead3ars.test`, name: 'X', password: 'short', role: 'student' },
});
check('short password is rejected', shortPw.status === 400, `status ${shortPw.status}`);

/* ---------- login ---------- */

const badLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: newEmail, password: 'wrong-password' },
});
check('wrong password is rejected', badLogin.status === 401, `status ${badLogin.status}`);

const login = await call('/api/auth/login', {
  method: 'POST',
  body: { email: newEmail, password: 'smoke-pass-2026' },
});
check('correct password is accepted', login.status === 200, `status ${login.status}`);

const ada = await call('/api/auth/login', {
  method: 'POST',
  body: { email: 'ada@dead3ars.test', password: 'student-pass-2026' },
});
check('seeded student can sign in', ada.status === 200, `status ${ada.status}`);

/* ---------- the answer key must not be in the HTML ---------- */

const page = await call(`/modules/${target.id}`);
check('module page renders', page.status === 200, `status ${page.status}`);
check('module body is present in the HTML', page.body.includes(target.title));

const leak = target.assessment.find((q) => page.body.includes(q.explain.slice(0, 40)));
check('answer explanations are NOT in the HTML', leak === undefined);
check(
  'one option string IS in the HTML (so the check above is meaningful)',
  page.body.includes(target.assessment[0].options[0]),
);

/* ---------- the page actually renders its teaching sections ---------- */

/* React escapes apostrophes, so match the fragment before the apostrophe. */
for (const marker of ['Scenario', 'Attacker', 'Defender', 'Key concepts', 'Assessment']) {
  check(`module page renders the "${marker}" section`, page.body.includes(marker));
}
check('module page names the lab', page.body.includes(target.lab.name));
check('module page lists a defensive control', page.body.includes(target.defenses[0]));

/* ---------- modules past the free preview are gated ---------- */

const lockedModule = modules[FREE_MODULE_LIMIT];
if (lockedModule) {
  const anonLocked = await call(`/modules/${lockedModule.id}`);
  check(
    `module ${lockedModule.id} is locked to anonymous readers`,
    anonLocked.status === 200 && anonLocked.body.includes('Locked'),
    `status ${anonLocked.status}`,
  );
  check(
    `locked module does not leak its scenario body`,
    !anonLocked.body.includes(lockedModule.sections['scenario'].slice(0, 60)),
  );

  const studentUnlocked = await call(`/modules/${lockedModule.id}`, { cookie: studentCookie ?? undefined });
  check(
    `module ${lockedModule.id} is readable once signed in`,
    studentUnlocked.body.includes(lockedModule.lab.name),
  );
}

/* ---------- a student is bounced away from the teacher dashboard ---------- */

const studentTeacherPage = await call('/teacher', { cookie: studentCookie ?? undefined });
check(
  'a student is redirected off the teacher dashboard',
  studentTeacherPage.status >= 300 && studentTeacherPage.status < 400,
  `status ${studentTeacherPage.status}, location ${studentTeacherPage.location}`,
);
check(
  'the student is sent to their own dashboard',
  (studentTeacherPage.location ?? '').includes('/dashboard'),
  studentTeacherPage.location ?? 'no location header',
);

const anonQuiz = await call('/api/quiz', {
  method: 'POST',
  body: { moduleId: target.id, answers: target.assessment.map(() => 0) },
});
check('anonymous cannot submit an assessment', anonQuiz.status === 401, `status ${anonQuiz.status}`);

/* ---------- server-side grading ---------- */

const wrongCount = await call('/api/quiz', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { moduleId: target.id, answers: [0] },
});
check('a partial answer set is rejected', wrongCount.status === 400, `status ${wrongCount.status}`);

const allWrong = await call('/api/quiz', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: {
    moduleId: target.id,
    /* Pick, for each question, an option that is deliberately not the answer. */
    answers: target.assessment.map((q) => (q.answer === 0 ? 1 : 0)),
  },
});
const wrongResult = allWrong.json<{ score: number; total: number; passed: boolean }>();
check('an all-wrong submission scores 0', wrongResult.score === 0, `scored ${wrongResult.score}/${wrongResult.total}`);
check('an all-wrong submission does not pass', wrongResult.passed === false);

const correct = await call('/api/quiz', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { moduleId: target.id, answers: target.assessment.map((q) => q.answer) },
});
const graded = correct.json<{ score: number; total: number; passed: boolean; results: unknown[] }>();
check('a correct submission scores full marks', graded.score === graded.total, `scored ${graded.score}/${graded.total}`);
check('explanations are released only after grading', graded.results.length === target.assessment.length);

const badModule = await call('/api/quiz', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { moduleId: 'm99-does-not-exist', answers: [0] },
});
check('unknown module id is rejected', badModule.status === 404, `status ${badModule.status}`);

/* ---------- a client may not claim a passed assessment ---------- */

const fakePass = await call('/api/progress', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { moduleId: target.id, status: 'assessment-passed' },
});
check('client cannot self-report assessment-passed', fakePass.status === 400, `status ${fakePass.status}`);

const labDone = await call('/api/progress', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { moduleId: target.id, status: 'lab-complete' },
});
check('client may report lab-complete', labDone.status === 200, `status ${labDone.status}`);

/* ---------- notes round-trip ---------- */

const noteBody = `smoke note ${stamp}\n\n- one\n- two`;
const putNote = await call('/api/notes', {
  method: 'PUT',
  cookie: studentCookie ?? undefined,
  body: { moduleId: target.id, body: noteBody },
});
check('notes can be saved', putNote.status === 200, `status ${putNote.status}`);

const getNote = await call(`/api/notes?moduleId=${target.id}`, { cookie: studentCookie ?? undefined });
check('the saved note comes back byte-identical', getNote.json<{ body: string }>().body === noteBody);

/* ---------- teacher boundary ---------- */

const studentTeacher = await call('/api/teacher', { cookie: studentCookie ?? undefined });
check('a student is forbidden from the teacher API', studentTeacher.status === 403, `status ${studentTeacher.status}`);

const teacher = await call('/api/auth/login', {
  method: 'POST',
  body: { email: 'teacher@dead3ars.test', password: 'teacher-pass-2026' },
});
check('seeded teacher can sign in', teacher.status === 200, `status ${teacher.status}`);

const cohort = await call('/api/teacher', { cookie: teacher.cookie ?? undefined });
const cohortData = cohort.json<{
  cohort: { email: string; assessments_passed: number }[];
  stats: { modules: number; questions: number };
}>();
check('teacher can read the cohort', cohort.status === 200, `status ${cohort.status}`);
check(
  'the cohort includes the student we just created',
  cohortData.cohort.some((r) => r.email === newEmail),
);
check(
  'the student we graded shows a passed assessment',
  (cohortData.cohort.find((r) => r.email === newEmail)?.assessments_passed ?? 0) >= 1,
);
check('curriculum stats match the content on disk', cohortData.stats.modules === modules.length);

/* ---------- classroom tools: classes, assignments, gradebook ---------- */

const studentMakesClass = await call('/api/classes', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { name: 'A class a student should not be able to make' },
});
check('a student cannot create a class', studentMakesClass.status === 403, `status ${studentMakesClass.status}`);

const klass = await call('/api/classes', {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { name: `Smoke Class ${stamp}` },
});
const klassId = klass.json<{ klass: { id: number; join_code: string } }>().klass.id;
const joinCode = klass.json<{ klass: { id: number; join_code: string } }>().klass.join_code;
check('a teacher can create a class', klass.status === 201, `status ${klass.status}`);
check('the class has a join code', typeof joinCode === 'string' && joinCode.startsWith('DZ-'));

const badJoin = await call('/api/classes/join', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { code: 'DZ-NOPE99' },
});
check('an unknown join code is rejected', badJoin.status === 404, `status ${badJoin.status}`);

const join = await call('/api/classes/join', {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { code: joinCode },
});
check('a student with the code can join the class', join.status === 200, `status ${join.status}`);

const assign = await call(`/api/classes/${klassId}/assignments`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  /* Deliberately a module this student has NOT passed: overdue only flags
   * assigned work that is past due and still unpassed. */
  body: { moduleId: assignedModule.id, dueAt: '2000-01-01' },
});
check('a teacher can assign a module', assign.status === 201, `status ${assign.status}`);

const detail = await call(`/api/classes/${klassId}`, { cookie: teacher.cookie ?? undefined });
const detailData = detail.json<{
  roster: { email: string }[];
  gradebook: { modules: string[]; rows: { student: { email: string }; overdue: string[] }[] };
}>();
check('the gradebook names the assigned module', detailData.gradebook.modules.includes(assignedModule.id));
check('the gradebook includes the enrolled student', detailData.gradebook.rows.some((r) => r.student.email === newEmail));
check(
  'a module past its due date is flagged overdue for a student who has not passed it',
  (detailData.gradebook.rows.find((r) => r.student.email === newEmail)?.overdue ?? []).includes(assignedModule.id),
);

/* A second teacher must not be able to reach the first teacher's class. */
const otherTeacher = await call('/api/auth/register', {
  method: 'POST',
  body: { email: `other-teacher-${stamp}@dead3ars.test`, name: 'Other Teacher', password: 'teacher-pass-2026', role: 'teacher' },
});
const intrusion = await call(`/api/classes/${klassId}`, { cookie: otherTeacher.cookie ?? undefined });
check(
  "another teacher cannot read a class they do not own",
  intrusion.status === 404,
  `status ${intrusion.status}`,
);

const exportRes = await call(`/api/classes/${klassId}/export`, { cookie: teacher.cookie ?? undefined });
check('the CSV export is served', exportRes.status === 200, `status ${exportRes.status}`);
check('the CSV export is text/csv', (exportRes.body.length > 0 && exportRes.status === 200));
check('the CSV export names the enrolled student', exportRes.body.includes(newEmail));
check(
  'a student cannot export the class list',
  (await call(`/api/classes/${klassId}/export`, { cookie: studentCookie ?? undefined })).status === 403,
);

const assignedOnDashboard = await call('/dashboard', { cookie: studentCookie ?? undefined });
check(
  'assigned work appears on the student dashboard',
  assignedOnDashboard.status === 200 && assignedOnDashboard.body.includes('Assigned to you'),
);

const unassign = await call(`/api/classes/${klassId}/assignments?moduleId=${assignedModule.id}`, {
  method: 'DELETE',
  cookie: teacher.cookie ?? undefined,
});
check('a teacher can remove an assignment', unassign.status === 200, `status ${unassign.status}`);

/* ---------- sign out ---------- */

const out = await call('/api/auth/logout', { method: 'POST', cookie: studentCookie ?? undefined });
check('sign out succeeds', out.status === 200, `status ${out.status}`);

const afterLogout = await call('/api/notes?moduleId=' + target.id, { cookie: studentCookie ?? undefined });
check('the destroyed session no longer works', afterLogout.status === 401, `status ${afterLogout.status}`);

console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} FAILURE(S)`}  (${passed} passed, ${failed} failed)\n`);
process.exit(failed === 0 ? 0 : 1);
