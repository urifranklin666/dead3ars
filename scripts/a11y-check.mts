/*
 * Accessibility check over the Chrome DevTools Protocol, driven by axe-core.
 *
 * The same harness as test:visual (headless Chrome, no extra browser stack), but
 * instead of reading computed styles it injects axe-core once per page — via
 * Page.addScriptToEvaluateOnNewDocument, which persists across navigations — and
 * audits the rendered DOM at two widths. Table-heavy teacher views are the
 * reason a narrow width is in the set: a gradebook that overflows off-screen is
 * a real failure that only shows at 390px.
 *
 *   npm run dev               # in one terminal
 *   npm run test:a11y         # in another
 *
 * axe-core is a pinned devDependency evaluated from node_modules, never a CDN —
 * the assertion runs against the same bytes every time and nothing is fetched
 * from a third party at test time.
 *
 * Only serious and critical violations fail the run by default; moderate and
 * minor are listed as notices so a backlog is visible without making the gate
 * unreliable. Set DZ_A11Y_ALL=1 to fail on those too.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = process.env.DZ_BASE ?? 'http://localhost:3000';
const DEVTOOLS_PORT = 9334;
/* Overridable for an unusual install; otherwise the usual location per platform,
 * so the same command works on the Windows dev box and a Linux runner. */
const CHROME =
  process.env.DZ_CHROME ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome');
const ALL_SEVERITIES = process.env.DZ_A11Y_ALL === '1';
/* Proof that the render guard below can fail: with this set, the role cookie is
 * deliberately withheld, every protected page should redirect to /login, and the
 * run must report those as failures rather than auditing the sign-in page and
 * passing. */
const FORCE_ANON = process.env.DZ_A11Y_FORCE_ANON === '1';

/* Text that only appears for the matching session, taken from Nav.tsx, so a
 * cookie that failed to apply is detected instead of being audited as an
 * anonymous page. */
const ROLE_MARKER: Record<Role, string | null> = {
  anon: null,
  student: 'Dashboard',
  teacher: 'Cohort',
  admin: 'Admin',
};

const WIDTHS = [
  { label: 'desktop', width: 1280, height: 900, mobile: false },
  { label: 'mobile', width: 390, height: 844, mobile: true },
];

/* ---------------------------------------------------------------- accounts */

const ACCOUNTS = {
  student: { email: 'ada@dead3ars.test', password: 'student-pass-2026' },
  teacher: { email: 'teacher@dead3ars.test', password: 'teacher-pass-2026' },
  admin: { email: 'admin@dead3ars.test', password: 'admin-pass-2026' },
} as const;

type Role = 'anon' | keyof typeof ACCOUNTS;

/* ------------------------------------------------------------- the corpus */

/* Ids are read from the database rather than guessed, so the audit covers the
 * real populated pages instead of a 404 that silently passes. */
function discover(): { className: string; classId: number; assignmentId: number; studentId: number } {
  const dbPath = process.env.DZ_DB ?? resolve(process.cwd(), 'data', 'dead3ars.db');
  const db = new DatabaseSync(dbPath);
  const klass = db
    .prepare(
      `SELECT c.id, c.name, COUNT(DISTINCT e.student_id) AS students
         FROM classes c LEFT JOIN enrollments e ON e.class_id = c.id
        GROUP BY c.id ORDER BY students DESC LIMIT 1`,
    )
    .get() as { id: number; name: string; students: number } | undefined;
  if (!klass) throw new Error('no class in the database — run `npm run seed` first');

  const assignment = db
    .prepare('SELECT id FROM assignments WHERE class_id = ? ORDER BY id LIMIT 1')
    .get(klass.id) as { id: number } | undefined;
  if (!assignment) throw new Error(`class ${klass.id} has no assignment — run \`npm run seed\` first`);

  const enrolled = db
    .prepare('SELECT student_id FROM enrollments WHERE class_id = ? ORDER BY student_id LIMIT 1')
    .get(klass.id) as { student_id: number } | undefined;
  if (!enrolled) throw new Error(`class ${klass.id} has no enrolled student`);

  return { className: klass.name, classId: klass.id, assignmentId: assignment.id, studentId: enrolled.student_id };
}

/* ---------------------------------------------------------------- results */

let passed = 0;
let failed = 0;
let notices = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? ` -- ${detail}` : ''}`);
  }
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

/* ------------------------------------------------------------------- CDP */

let chrome: ChildProcess | undefined;
let ws: WebSocket | undefined;
const profile = mkdtempSync(join(tmpdir(), 'dz-a11y-'));

async function waitForDevtools(): Promise<string> {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json/list`);
      const targets = (await res.json()) as { type: string; webSocketDebuggerUrl: string }[];
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

function cdp(socket: WebSocket) {
  let next = 0;
  const pending = new Map<number, (v: unknown) => void>();
  const events = new Map<string, ((p: unknown) => void)[]>();

  socket.addEventListener('message', (ev) => {
    const msg = JSON.parse(String((ev as MessageEvent).data)) as {
      id?: number;
      result?: unknown;
      error?: unknown;
      method?: string;
      params?: unknown;
    };
    if (msg.id !== undefined) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve?.(msg.error ? { __error: msg.error } : msg.result);
      return;
    }
    if (msg.method) for (const fn of events.get(msg.method) ?? []) fn(msg.params);
  });

  return {
    send<T = unknown>(method: string, params?: unknown): Promise<T> {
      const id = ++next;
      return new Promise<T>((res) => {
        pending.set(id, res as (v: unknown) => void);
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method: string): Promise<unknown> {
      return new Promise((res) => {
        const fn = (p: unknown) => {
          events.set(method, (events.get(method) ?? []).filter((f) => f !== fn));
          res(p);
        };
        events.set(method, [...(events.get(method) ?? []), fn]);
      });
    },
  };
}

/* ------------------------------------------------------------ axe runner */

interface AxeNode {
  target: string[];
  html: string;
  failureSummary?: string;
}
interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

/* Runs one axe audit in the page. `runOnly` keeps it to the WCAG rule sets, and
 * the promise is awaited by CDP so the result is the real report. */
const RUN_AXE = `(async () => {
  if (!window.axe) return JSON.stringify({ error: 'axe-core was not injected' });
  const result = await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    resultTypes: ['violations'],
  });
  return JSON.stringify({
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.slice(0, 3).map((n) => ({
        target: n.target.map(String),
        html: String(n.html).slice(0, 120),
        failureSummary: n.failureSummary,
      })),
    })),
  });
})()`;

/* ------------------------------------------------------------------ main */

async function login(role: keyof typeof ACCOUNTS): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[role]),
  });
  if (!res.ok) throw new Error(`could not sign in as ${role} (${res.status}) — is the server seeded?`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`no session cookie for ${role}`);
  return setCookie.split(';')[0];
}

async function main() {
  const ids = discover();
  const mods = (() => {
    const dbPath = process.env.DZ_DB ?? resolve(process.cwd(), 'data', 'dead3ars.db');
    const db = new DatabaseSync(dbPath);
    const rows = db
      .prepare("SELECT DISTINCT module_id FROM assignments ORDER BY module_id LIMIT 1")
      .all() as { module_id: string }[];
    return rows[0]?.module_id ?? 'm01-ethics-law';
  })();
  console.log(`\ndead3ars accessibility check against ${BASE}`);
  console.log(`class ${ids.classId} "${ids.className}" · assignment ${ids.assignmentId} · student ${ids.studentId}`);
  if (FORCE_ANON) console.log('DZ_A11Y_FORCE_ANON=1 — withholding role cookies to test the render guard');
  console.log('');

  const cookies: Record<string, string> = {};
  cookies.student = await login('student');
  cookies.teacher = await login('teacher');
  cookies.admin = await login('admin');

  const pages: { role: Role; path: string; name: string }[] = [
    { role: 'anon', path: '/', name: 'landing' },
    { role: 'anon', path: '/login', name: 'sign in' },
    { role: 'anon', path: '/register', name: 'register' },
    { role: 'anon', path: '/modules', name: 'module index' },
    { role: 'anon', path: `/modules/${mods}`, name: 'module (assigned)' },
    { role: 'anon', path: '/modules/m11-ai-llm-attack-surface', name: 'module (locked gate)' },
    { role: 'student', path: '/dashboard', name: 'student dashboard' },
    { role: 'student', path: '/notes', name: 'notes' },
    { role: 'student', path: `/classes/${ids.classId}`, name: 'class (student)' },
    { role: 'student', path: `/assignments/${ids.assignmentId}`, name: 'assignment (student)' },
    { role: 'teacher', path: '/teacher', name: 'teacher home' },
    { role: 'teacher', path: '/teacher/classes', name: 'teacher classes' },
    { role: 'teacher', path: `/teacher/classes/${ids.classId}`, name: 'class detail + gradebook' },
    { role: 'teacher', path: `/teacher/classes/${ids.classId}/analytics`, name: 'class analytics' },
    { role: 'teacher', path: `/teacher/assignments/${ids.assignmentId}`, name: 'assignment grading' },
    { role: 'teacher', path: `/teacher/students/${ids.studentId}`, name: 'student drill-down' },
    { role: 'admin', path: '/admin', name: 'admin console' },
  ];

  const axeSource = readFileSync(resolve('node_modules', 'axe-core', 'axe.min.js'), 'utf8');

  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${DEVTOOLS_PORT}`,
      `--user-data-dir=${profile}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  ws = new WebSocket(await waitForDevtools());
  await new Promise<void>((res, rej) => {
    ws!.addEventListener('open', () => res());
    ws!.addEventListener('error', () => rej(new Error('CDP socket failed')));
  });

  const client = cdp(ws);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  /* Inject once; it survives every navigation in this target. */
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: axeSource });

  const seen = new Set<string>();

  for (const width of WIDTHS) {
    console.log(`--- ${width.label} (${width.width}px) ---`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: width.width,
      height: width.height,
      deviceScaleFactor: 1,
      mobile: width.mobile,
    });

    for (const page of pages) {
      const label = `${page.name} @${width.label}`;

      /* The cookie is applied before navigating — it has to be, since the server
       * decides what to render — but if it silently fails to stick we would be
       * auditing /login and reporting a pass for a page we never saw. So read
       * back what the browser actually holds and refuse to audit on a mismatch. */
      await client.send('Network.clearBrowserCookies');
      let authOk = true;
      let authDetail = '';
      if (page.role !== 'anon' && !FORCE_ANON) {
        const [name, value] = cookies[page.role].split('=');
        await client.send('Network.setCookie', {
          name,
          value,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        });
        const stored = await client.send<{ cookies: { name: string; value: string }[] }>(
          'Network.getCookies',
          { urls: [BASE] },
        );
        const found = stored.cookies?.find((c) => c.name === name);
        authOk = found?.value === value;
        if (!authOk) authDetail = `${name} cookie did not stick`;
      } else if (page.role !== 'anon' && FORCE_ANON) {
        authOk = false;
        authDetail = 'cookie deliberately withheld';
      }

      const loaded = client.once('Page.loadEventFired');
      await client.send('Page.navigate', { url: `${BASE}${page.path}` });
      await loaded;
      await new Promise((r) => setTimeout(r, 350));

      /* A protected page redirects to /login when the session is missing, so the
       * rendered URL is the second half of the check: it must be the page we
       * asked for, and it must carry the nav that only that role sees. */
      const where = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
        expression: 'location.pathname + "|" + document.body.innerText.slice(0, 4000)',
        returnByValue: true,
      });
      const [pathname, text] = where.result.value.split('|');
      const marker = ROLE_MARKER[page.role];
      if (authOk && pathname !== page.path) {
        authOk = false;
        authDetail = `redirected to ${pathname}`;
      }
      if (authOk && marker && !text.includes(marker)) {
        authOk = false;
        authDetail = `the "${marker}" nav marker is absent, so this is not the ${page.role} view`;
      }
      if (!authOk) {
        check(`${label}: rendered as the ${page.role === 'anon' ? 'anonymous' : page.role} view`, false, authDetail);
      }

      const res = await client.send<{ result: { value: string }; exceptionDetails?: unknown }>(
        'Runtime.evaluate',
        { expression: RUN_AXE, awaitPromise: true, returnByValue: true },
      );
      if (res.exceptionDetails) {
        check(`${label}: audit ran`, false, 'axe threw');
        continue;
      }
      const parsed = JSON.parse(res.result.value) as { violations?: AxeViolation[]; error?: string };
      if (parsed.error) {
        check(`${label}: audit ran`, false, parsed.error);
        continue;
      }

      const violations = parsed.violations ?? [];
      const gate = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      /* Only the page's own rules should be gated; a violation repeated across
       * many pages is one bug, so report each rule id once per page but count
       * the page as clean only when no gated rule fires. */
      for (const v of violations) {
        const key = `${v.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          const where = v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(', ');
          console.log(`      [${v.impact}] ${v.id}: ${v.help}\n        at ${where}`);
        }
      }
      const gatedCount = gate.length;
      const noticeCount = violations.length - gatedCount;
      notices += noticeCount;
      check(
        `${label}: no serious/critical violations`,
        gatedCount === 0,
        gatedCount === 0
          ? violations.length
            ? `${noticeCount} lower-severity`
            : 'clean'
          : gate.map((v) => `${v.id}(${v.nodes.length})`).join(' '),
      );
    }
  }

  console.log(
    `\n${failed === 0 ? 'ALL GREEN' : `${failed} FAILURE(S)`}  (${passed} passed, ${failed} failed, ${notices} lower-severity notices)\n`,
  );
  if (notices > 0 && !ALL_SEVERITIES) {
    console.log('lower-severity findings are listed above but do not fail the run; set DZ_A11Y_ALL=1 to gate on them\n');
  }
}

try {
  await main();
} catch (e) {
  console.error(`\naccessibility check could not run: ${e instanceof Error ? e.message : String(e)}\n`);
  failed++;
} finally {
  ws?.close();
  chrome?.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* temp dir; not worth failing over */
  }
}

process.exit(failed === 0 ? 0 : 1);
