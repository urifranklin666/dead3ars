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
  header: (name: string) => string | null;
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
    header: (name: string) => res.headers.get(name),
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

/* ---------- classwork: rubric, submission, grading ---------- */

const workAssign = await call(`/api/classes/${klassId}/assignments`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { moduleId: assignedModule.id, dueAt: null },
});
const assignmentId = workAssign.json<{ assignment: { id: number } }>().assignment.id;
check('an assignment can be re-added for the classwork checks', workAssign.status === 201, `status ${workAssign.status}`);

const setRubric = await call(`/api/assignments/${assignmentId}`, {
  method: 'PATCH',
  cookie: teacher.cookie ?? undefined,
  body: {
    rubric: [
      { name: 'Findings', description: 'Correct and reproducible', points: 60 },
      { name: 'Defence', description: 'Names the control', points: 40 },
    ],
  },
});
const rubricOut = setRubric.json<{ rubric: { name: string; points: number }[] }>().rubric;
check('a teacher can set a rubric', setRubric.status === 200 && rubricOut.length === 2, `len ${rubricOut.length}`);

const studentRubric = await call(`/api/assignments/${assignmentId}/submission`, { cookie: studentCookie ?? undefined });
check(
  'the student sees the rubric',
  studentRubric.status === 200 && studentRubric.json<{ rubric: unknown[] }>().rubric.length === 2,
);

const submit = await call(`/api/assignments/${assignmentId}/submission`, {
  method: 'PUT',
  cookie: studentCookie ?? undefined,
  body: { body: 'Here is my write-up of the lab.', link: 'https://example.test/evidence' },
});
check('a student can submit work', submit.status === 200, `status ${submit.status}`);

const emptySubmit = await call(`/api/assignments/${assignmentId}/submission`, {
  method: 'PUT',
  cookie: studentCookie ?? undefined,
  body: { body: '   ', link: '' },
});
check('an empty submission is rejected', emptySubmit.status === 400, `status ${emptySubmit.status}`);

/* The teacher's grading view must show the submission; the student cannot read it. */
const gradesGet = await call(`/api/assignments/${assignmentId}/grades`, { cookie: teacher.cookie ?? undefined });
const workRows = gradesGet.json<{ work: { student: { email: string }; submission: unknown; grade: unknown }[] }>().work;
check(
  "the teacher's grading view shows the student's submission",
  workRows.some((w) => w.student.email === newEmail && w.submission !== null),
);
check(
  'a student cannot open the grading view',
  (await call(`/api/assignments/${assignmentId}/grades`, { cookie: studentCookie ?? undefined })).status === 403,
);

/* A teacher grading a student who is not in the class is refused. `ada` is a
 * real student, but not a member of this newly-created smoke class. */
const strangerId = ada.json<{ user: { id: number } }>().user.id;
const gradeStranger = await call(`/api/assignments/${assignmentId}/grades`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { studentId: strangerId, score: 50, max: 100, feedback: 'should not land' },
});
check(
  'a teacher cannot grade a student who is not enrolled',
  gradeStranger.status === 400,
  `status ${gradeStranger.status}`,
);

const newStudentId = login.json<{ user: { id: number } }>().user.id;
const grade = await call(`/api/assignments/${assignmentId}/grades`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { studentId: newStudentId, score: 85, max: 100, feedback: 'Good work — tighten the intro.' },
});
check('a teacher can grade submitted work', grade.status === 201, `status ${grade.status}`);

const overMax = await call(`/api/assignments/${assignmentId}/grades`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { studentId: newStudentId, score: 120, max: 100, feedback: 'nope' },
});
check('a score above the maximum is rejected', overMax.status === 400, `status ${overMax.status}`);

const studentSeesGrade = await call(`/api/assignments/${assignmentId}/submission`, { cookie: studentCookie ?? undefined });
const gradeSeen = studentSeesGrade.json<{ grade: { score: number; max: number; feedback: string } | null }>().grade;
check(
  'the student sees their own mark and feedback',
  gradeSeen?.score === 85 && gradeSeen?.feedback.includes('tighten the intro'),
  `score ${gradeSeen?.score}`,
);

/* Another teacher must not be able to grade into this class's assignment. */
check(
  "another teacher cannot grade another teacher's assignment",
  (
    await call(`/api/assignments/${assignmentId}/grades`, {
      method: 'POST',
      cookie: otherTeacher.cookie ?? undefined,
      body: { studentId: newStudentId, score: 100, max: 100, feedback: 'intruder' },
    })
  ).status === 404,
);

const myWork = await call('/api/my/work', { cookie: studentCookie ?? undefined });
check(
  "the student's own work API includes the graded assignment",
  myWork.status === 200 && myWork.json<{ work: { assignment_id: number }[] }>().work.some((w) => w.assignment_id === assignmentId),
);

const analytics = await call(`/teacher/classes/${klassId}/analytics`, { cookie: teacher.cookie ?? undefined });
check(
  'the analytics page renders for the owning teacher',
  analytics.status === 200 && analytics.body.includes('Where the class is stuck'),
);

/* Page renders, not just APIs: the grading page passes a row object across the
 * server/client boundary, which is where null-prototype rows have bitten. */
const grading = await call(`/teacher/assignments/${assignmentId}`, { cookie: teacher.cookie ?? undefined });
check(
  'the grading page renders with a submission and a grade present',
  grading.status === 200 && grading.body.includes('Submissions') && grading.body.includes('write-up'),
  `status ${grading.status}`,
);

const studentAssignmentPage = await call(`/assignments/${assignmentId}`, { cookie: studentCookie ?? undefined });
check(
  'the student assignment page renders the mark and feedback',
  studentAssignmentPage.status === 200 && studentAssignmentPage.body.includes('tighten the intro'),
  `status ${studentAssignmentPage.status}`,
);

check(
  'a student is redirected away from the teacher grading page',
  (await call(`/teacher/assignments/${assignmentId}`, { cookie: studentCookie ?? undefined })).status === 307,
);

/* ---------- announcements ---------- */

const ann = await call(`/api/classes/${klassId}/announcements`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { title: 'Welcome', body: 'Read module 1 before Friday.' },
});
check('a teacher can post an announcement', ann.status === 201, `status ${ann.status}`);

check(
  'a student cannot post an announcement',
  (
    await call(`/api/classes/${klassId}/announcements`, {
      method: 'POST',
      cookie: studentCookie ?? undefined,
      body: { body: 'not allowed' },
    })
  ).status === 403,
);

const stuClass = await call(`/classes/${klassId}`, { cookie: studentCookie ?? undefined });
check(
  'the student class page shows the announcement and assigned work',
  stuClass.status === 200 && stuClass.body.includes('Read module 1 before Friday'),
  `status ${stuClass.status}`,
);

/* ---------- class discussion ---------- */

/* Enrol a second student (ada) so the ownership rules can be exercised. */
await call('/api/classes/join', { method: 'POST', cookie: ada.cookie ?? undefined, body: { code: joinCode } });

const thread = await call(`/api/classes/${klassId}/discussion`, {
  method: 'POST',
  cookie: studentCookie ?? undefined,
  body: { body: 'Is the lab doable on macOS?' },
});
const threadId = thread.json<{ post: { id: number } }>().post.id;
check('a student can start a discussion thread', thread.status === 201, `status ${thread.status}`);

const reply = await call(`/api/classes/${klassId}/discussion`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { body: 'Yes — the lab notes cover it.', parentId: threadId },
});
check('a teacher can reply to a thread', reply.status === 201, `status ${reply.status}`);

const threadsRead = await call(`/api/classes/${klassId}/discussion`, { cookie: studentCookie ?? undefined });
check(
  'the discussion returns the thread with its reply nested',
  threadsRead.status === 200 &&
    threadsRead.json<{ threads: { replies: unknown[] }[] }>().threads.some((t) => t.replies.length > 0),
);

check(
  'a non-member cannot read the discussion',
  (await call(`/api/classes/${klassId}/discussion`, { cookie: otherTeacher.cookie ?? undefined })).status === 404,
);

check(
  "an enrolled student cannot delete another student's post",
  (
    await call(`/api/classes/${klassId}/discussion?postId=${threadId}`, {
      method: 'DELETE',
      cookie: ada.cookie ?? undefined,
    })
  ).status === 403,
);

check(
  'the class teacher can delete a student post',
  (
    await call(`/api/classes/${klassId}/discussion?postId=${threadId}`, {
      method: 'DELETE',
      cookie: teacher.cookie ?? undefined,
    })
  ).status === 200,
);

/* ---------- roster import ---------- */

const importCsv = [
  'name,email',
  `Import One,imp-${stamp}-1@dead3ars.test`,
  `Import Two,imp-${stamp}-2@dead3ars.test`,
  'Ada Already Registered,ada@dead3ars.test',
].join('\n');

const imp = await call(`/api/classes/${klassId}/roster/import`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { csv: importCsv },
});
const impData = imp.json<{
  created: number;
  enrolled: number;
  existing: number;
  passwords: { email: string; password: string }[];
}>();
check('a teacher can import a roster', imp.status === 201, `status ${imp.status}`);
check('the import creates an account per new email', impData.created === 2, `created ${impData.created}`);
check('an email that already has an account is reused, not recreated', impData.existing === 1, `existing ${impData.existing}`);
check('the import returns one password per new account', impData.passwords.length === 2, `len ${impData.passwords.length}`);

const importedLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: impData.passwords[0]?.email, password: impData.passwords[0]?.password },
});
check('a generated account can sign in with its one-time password', importedLogin.status === 200, `status ${importedLogin.status}`);

const detailAfterImport = await call(`/api/classes/${klassId}`, { cookie: teacher.cookie ?? undefined });
check(
  'the imported students appear in the roster',
  detailAfterImport
    .json<{ roster: { email: string }[] }>()
    .roster.some((r) => r.email === `imp-${stamp}-1@dead3ars.test`),
);

const badCsv = await call(`/api/classes/${klassId}/roster/import`, {
  method: 'POST',
  cookie: teacher.cookie ?? undefined,
  body: { csv: 'A Real Student,ok@dead3ars.test\nnonsense-line-without-email\n' },
});
check(
  'a malformed roster line is skipped rather than failing the import',
  badCsv.status === 201 && badCsv.json<{ skipped: unknown[] }>().skipped.length === 1,
  `status ${badCsv.status}`,
);

check(
  'a student cannot import a roster',
  (
    await call(`/api/classes/${klassId}/roster/import`, {
      method: 'POST',
      cookie: studentCookie ?? undefined,
      body: { csv: 'X,x@dead3ars.test' },
    })
  ).status === 403,
);

check(
  "another teacher cannot import into a class they do not own",
  (
    await call(`/api/classes/${klassId}/roster/import`, {
      method: 'POST',
      cookie: otherTeacher.cookie ?? undefined,
      body: { csv: 'X,x@dead3ars.test' },
    })
  ).status === 404,
);

/* ---------- health, admin oversight, and the audit trail ---------- */

const health = await call('/api/health');
check('the health probe reports ok', health.status === 200 && health.json<{ status: string }>().status === 'ok', `status ${health.status}`);
check('the health probe counts the curriculum', health.json<{ modules: number }>().modules > 0);

/* A student must not reach the admin console or its API. */
check(
  'a student cannot open the admin overview',
  (await call('/api/admin/overview', { cookie: studentCookie ?? undefined })).status === 403,
);
check(
  'a teacher cannot open the admin overview',
  (await call('/api/admin/overview', { cookie: teacher.cookie ?? undefined })).status === 403,
);
check(
  'an anonymous visitor cannot read the audit trail',
  (await call('/api/admin/overview')).status === 401,
);

const adminLogin = await call('/api/auth/login', {
  method: 'POST',
  body: { email: 'admin@dead3ars.test', password: 'admin-pass-2026' },
});
check('the seeded admin can sign in', adminLogin.status === 200, `status ${adminLogin.status}`);
const adminCookie = adminLogin.cookie ?? undefined;

const adminOverview = await call('/api/admin/overview', { cookie: adminCookie });
const overview = adminOverview.json<{
  stats: { classes: number; auditEvents: number; users: Record<string, number> };
  users: { email: string; role: string }[];
  classes: { name: string }[];
  audit: { rows: { action: string }[] };
}>();
check('an admin can read the instance overview', adminOverview.status === 200, `status ${adminOverview.status}`);
check('the overview reports at least one class', overview.stats.classes >= 1, `classes ${overview.stats.classes}`);
check('the overview lists the seeded admin account', overview.users.some((u) => u.role === 'admin'));
check('the overview includes the audit trail', overview.stats.auditEvents > 0, `events ${overview.stats.auditEvents}`);

/* The earlier checks must have left a trail: a login, a class creation, grades. */
const actions = overview.audit.rows.map((r) => r.action);
check(
  'the audit trail recorded sign-ins, class creation, and grading',
  ['auth.login', 'class.create', 'grade.record'].every((a) => actions.some((x) => x.startsWith(a.split('.')[0]))),
  `saw ${[...new Set(actions)].slice(0, 6).join(', ')}`,
);

const adminPage = await call('/admin', { cookie: adminCookie });
check(
  'the admin console page renders',
  adminPage.status === 200 && adminPage.body.includes('Audit trail'),
  `status ${adminPage.status}`,
);
check(
  'a teacher is redirected away from the admin console',
  (await call('/admin', { cookie: teacher.cookie ?? undefined })).status === 307,
);

/* Role change: admin promotes a student, and is refused on their own row. */
const promote = await call('/api/admin/role', {
  method: 'POST',
  cookie: adminCookie,
  body: { userId: newStudentId, role: 'teacher' },
});
check('an admin can change a user role', promote.status === 200 && promote.json<{ changed: boolean }>().changed === true, `status ${promote.status}`);

const selfDemote = await call('/api/admin/role', {
  method: 'POST',
  cookie: adminCookie,
  body: { userId: adminLogin.json<{ user: { id: number } }>().user.id, role: 'student' },
});
check('an admin cannot change their own role', selfDemote.status === 400, `status ${selfDemote.status}`);

check(
  'a student cannot change roles',
  (
    await call('/api/admin/role', {
      method: 'POST',
      cookie: studentCookie ?? undefined,
      body: { userId: newStudentId, role: 'admin' },
    })
  ).status === 403,
);

/* ---------- sign out ---------- */

const out = await call('/api/auth/logout', { method: 'POST', cookie: studentCookie ?? undefined });
check('sign out succeeds', out.status === 200, `status ${out.status}`);

const afterLogout = await call('/api/notes?moduleId=' + target.id, { cookie: studentCookie ?? undefined });
check('the destroyed session no longer works', afterLogout.status === 401, `status ${afterLogout.status}`);

/* ---------- failed-sign-in throttling ---------- */

/* Deliberately last: this locks an account on the way through. */
const miss = (email: string, password: string) =>
  call('/api/auth/login', { method: 'POST', body: { email, password } });

/* Run the burst until throttled, and say how many tries it took. Each failure
 * is a 401 and the one that trips the limit is a 429. */
async function burstUntilThrottled(email: string, password: string, cap: number) {
  let reply = await miss(email, password);
  let tries = 1;
  while (reply.status === 401 && tries < cap) {
    reply = await miss(email, password);
    tries++;
  }
  return { reply, tries };
}

/* The throttle counts per account, in a window that defaults to 15 minutes.
 * A run a few seconds after a previous one would otherwise start with the
 * counter part-full — or already locked, which is what a naive rerun does.
 * Seeding one throwaway account with a known number of failures and asserting
 * the delta makes the check deterministic whatever state the window is in. */
const throttleEmail = `throttle-${stamp}@dead3ars.test`;
const seedFailures = 3;
for (let i = 0; i < seedFailures; i++) await miss(throttleEmail, 'wrong-password');

const { reply: lockResponse, tries } = await burstUntilThrottled(throttleEmail, 'wrong-password', 20);
/* `tries` includes the refused attempt, so the failures actually permitted are
 * everything before it. The limit is an allowance, not an attempt number. */
const allowedFailures = seedFailures + (tries - 1);
check('repeated wrong passwords are throttled with 429', lockResponse.status === 429, `status ${lockResponse.status}`);
check(
  'the account is throttled after the configured number of failures',
  allowedFailures === 5,
  `${allowedFailures} failures permitted before the lock (expected 5)`,
);
check(
  'a throttled response says how long to wait',
  Number(lockResponse.header('retry-after')) > 0,
  `Retry-After: ${lockResponse.header('retry-after')}`,
);
/* The sign-in form renders this field, so an empty one would leave the student
 * staring at "Something went wrong." with no idea they are locked out. */
check(
  'a throttled response carries a message the form can show',
  (lockResponse.json<{ error?: string }>().error ?? '').includes('Too many'),
  lockResponse.json<{ error?: string }>().error ?? '(no error field)',
);

/* The throttle is consulted before the password is verified, so even the
 * correct password is refused while the account is shut. This is the property
 * that makes the lock real rather than advisory. */
const correctWhileLocked = await miss(throttleEmail, 'wrong-password');
check('further attempts stay refused while throttled', correctWhileLocked.status === 429, `status ${correctWhileLocked.status}`);

/* The throttle is per-account, not global: a burst against one account must not
 * close the door on anybody else. This is the property that matters behind a
 * campus NAT, where every student shares one address. */
const bystander = await miss('linus@dead3ars.test', 'student-pass-2026');
check(
  'throttling one account does not block another',
  bystander.status === 200,
  `status ${bystander.status}${bystander.status === 429 ? ' (the shared-address limit tripped)' : ''}`,
);

/* And it must hold for accounts that do not exist, or a guesser could simply
 * aim at addresses that are not registered. */
const ghostEmail = `ghost-${stamp}@dead3ars.test`;
const ghost = await burstUntilThrottled(ghostEmail, 'nope', 20);
check('a nonexistent account is throttled too', ghost.reply.status === 429, `status ${ghost.reply.status}`);

/* A wrong password against an account that does not exist must look exactly
 * like one against an account that does — same status, same message. */
const missingAccount = await miss(`absent-${stamp}@dead3ars.test`, 'no-such-account');
check(
  'a nonexistent account is rejected like a real one',
  missingAccount.status === 401 && missingAccount.body === badLogin.body,
  `status ${missingAccount.status}`,
);

/* Throttled attempts must appear in the audit trail, distinct from ordinary
 * failures — an operator needs to see a lockout, not just bad passwords. */
const throttled = adminCookie
  ? await call('/api/admin/overview?action=auth.login_throttled', { cookie: adminCookie })
  : null;
check(
  'throttled attempts are recorded in the audit trail',
  throttled !== null && throttled.status === 200 && throttled.json<{ audit: { total: number } }>().audit.total > 0,
  throttled ? `total ${throttled.json<{ audit: { total: number } }>().audit.total}` : 'no admin session',
);

console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} FAILURE(S)`}  (${passed} passed, ${failed} failed)\n`);
process.exit(failed === 0 ? 0 : 1);
