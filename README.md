# dead3ars

A teacher/student learning environment for modern offensive security — built so that
every attack technique is taught alongside the control that stops it, the detection that
catches it, and the law that governs it.

The name is a joke at the reader's expense. The content is not.

## What this is

- **Twelve modules**, sourced from the current threat landscape rather than from any single
  piece of hardware: identity attacks, ransomware economics, supply-chain compromise,
  edge-device exploitation, the AI/LLM attack surface, and the detection and forensic work
  that follows.
- **A lab per module.** Each one is constrained to an environment the student owns — an
  isolated VM, a host they control, an artefact they generated, or public data only. No
  module targets a third party.
- **Two views of every technique.** The attacker's view explains the mechanics; the
  defender's view explains the countermeasure; the ethics block states the boundary and the
  law. `npm run check:curriculum` fails the build if a module is missing any of them.
- **Server-side assessment.** The answer key never reaches the browser. Grading, and the
  release of explanations, happen on the server only.
- **Student and teacher dashboards.** Students track per-module progress and keep private
  notes; teachers see the cohort's completion and where it stalls.
- **Classes and assignments.** A teacher creates a class, hands out its join code, and
  assigns modules with optional due dates. Each class has a gradebook and a CSV export;
  assigned work appears on the student's dashboard, with overdue work flagged.
- **Classwork and grading.** Students submit a write-up and a link against an assignment;
  teachers publish a rubric, grade each student with feedback, and see every submission in
  one place. Per-class analytics show which modules the cohort is stuck on.
- **Community and roster.** Teachers post announcements, the class has a threaded
  discussion open to its members, and a teacher can bulk-import a roster from CSV —
  new emails get accounts, existing ones are enrolled.

## Stack

| Layer      | Choice                                                 |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 16 (App Router, Turbopack) + React 19          |
| Language   | TypeScript (strict)                                    |
| Styling    | Tailwind v4 with a small custom theme in `globals.css` |
| Content    | Markdown + YAML frontmatter under `content/modules/`   |
| Validation | zod schemas, enforced by a script and by the app       |
| Database   | `node:sqlite` (`DatabaseSync`) — no native build step  |
| Auth       | scrypt password hashing, httpOnly session cookies      |

## Getting started

Requires **Node 22.5+** (for `node:sqlite`); the project is developed on Node 26 and CI runs
on Node 24.

```bash
npm install
npm run seed        # creates the demo cohort and some differentiated progress
npm run dev         # http://localhost:3000
```

Seed credentials (printed by `npm run seed` — change them before real use):

| Role    | Email                   | Password            |
| ------- | ----------------------- | ------------------- |
| Admin   | `admin@dead3ars.test`   | `admin-pass-2026`   |
| Teacher | `teacher@dead3ars.test` | `teacher-pass-2026` |
| Student | `ada@dead3ars.test`     | `student-pass-2026` |
| Student | `grace@dead3ars.test`   | `student-pass-2026` |
| Student | `linus@dead3ars.test`   | `student-pass-2026` |

The SQLite file lands in `data/` and is gitignored. `DZ_DB` overrides its path; `DZ_CONTENT`
overrides the content directory.

## Scripts

```bash
npm run dev               # dev server
npm run build             # production build
npm run start             # production server
npm run lint              # eslint
npm run typecheck         # tsc --noEmit
npm run check:curriculum  # validate every module's frontmatter and shape
npm run seed              # demo users + progress
npm run init:db           # create the schema and ensure an admin account
npm run test:smoke        # end-to-end HTTP test (needs the server running)
npm run test:visual       # computed-style check (needs Chrome; see below)
```

### The tests

`npm run test:smoke` drives the running server over real HTTP and asserts the
security-relevant behaviour, not just the happy path: that the answer explanations are absent
from the rendered HTML, that grading is server-side, that a client cannot self-report a passed
assessment, that a student is refused the teacher and admin APIs, that grading, roster import,
and role changes are audited, that failed sign-ins are throttled, and that progress, notes,
and sessions behave. 120 checks.

`npm run test:visual` launches headless Chrome and reads **computed** styles over the
DevTools Protocol. A screenshot cannot be asserted and a stylesheet existing proves nothing,
so this exists to catch the "the page renders but is invisible" class of bug — a stray
`display: none`, a missing theme token, a `backdrop-filter` over the whole viewport. It needs
Chrome; set `DZ_CHROME` if it is not at the default Windows path. It is not run in CI, where
Chrome availability would make the gate unreliable.

## Authoring a module

Drop a new file into `content/modules/` following the shape of an existing one. The
frontmatter is validated by `ModuleSchema` in `src/lib/curriculum.ts`, and the body should
carry `## Scenario`, `## Attacker's view`, `## Defender's view`, and `## Key concepts`. Then:

```bash
npm run check:curriculum
```

The validator enforces, among other things, that every module has at least one defensive
control, a specific ethics boundary and legal note, a lab environment drawn from
`sandbox | host | analysis | read-only`, and answer indices that are actually in range.

New ids must match `^m\d{2}-[a-z0-9-]+$` and the filename must equal the id.

## Deploy

The build is a self-contained server (`output: "standalone"`), so the image carries only
`server.js`, its traced dependencies, and the module markdown — not the source tree, not the
dev dependencies, and not the database.

```bash
docker build -t dead3ars .
docker run -d --name dead3ars -p 3000:3000 \
  -v dead3ars-data:/data \
  -e DZ_ADMIN_EMAIL=you@example.edu \
  -e DZ_ADMIN_PASSWORD='a-long-password' \
  dead3ars
```

| Variable            | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `DZ_DB`             | SQLite path; the image sets `/data/dead3ars.db`, so mount a volume there |
| `DZ_ADMIN_EMAIL`    | admin account to ensure on first boot (default `admin@dead3ars.local`) |
| `DZ_ADMIN_PASSWORD` | its password; if unset a random one is generated and logged once      |
| `DZ_INIT_ADMIN=0`   | skip admin creation entirely                                            |
| `DZ_DEMO=1`         | show the demo credentials on the sign-in page (never in production)    |
| `DZ_LOGIN_ACCOUNT_LIMIT` | failed sign-ins allowed per account per window (default 5)        |
| `DZ_LOGIN_IP_LIMIT` | failed sign-ins allowed per address per window (default 50; `0` disables) |
| `DZ_LOGIN_WINDOW_MINUTES` | throttle window length (default 15)                              |

First boot is self-initialising. `src/instrumentation.ts` opens the database (which applies
the schema) and ensures an admin account exists before the server serves, so a container
carrying only the standalone output needs no `tsx` and no seed step. The same logic is
available directly as `npm run init:db`. If an account already exists for `DZ_ADMIN_EMAIL`,
it is promoted to admin rather than left unreachable; an existing admin is never touched.

Two things are worth knowing when operating this:

- **The database is created at runtime, never baked in.** `db.ts` resolves `DZ_DB` at build
  time, so the tracer would otherwise record the local `data/dead3ars.db` as an asset and ship
  developer data inside the image — at the exact path the volume is meant to occupy.
  `outputFileTracingExcludes` prevents that (keys `/*` and `instrumentation`, because the
  instrumentation trace is entered under its own name and never matches an app route), and the
  Dockerfile additionally `rm -rf`s any traced copy, since the exclusion itself is inert on a
  Windows build host.
- **`/api/health` answers 200 only when the content directory and the database are both
  reachable**, and reports the module count, so a mis-traced image is visible from the probe
  rather than at the first module request. The Dockerfile wires it to `HEALTHCHECK`.

### Failed sign-ins

Sign-in attempts are throttled in two dimensions, counted in the database so every worker and
every restart sees the same state.

- **Per account** — five failures in fifteen minutes, keyed on the submitted address whether
  or not an account exists, so the response is identical for both and guessing cannot tell
  them apart. This is the load-bearing control: it cannot be escaped by changing source
  address. A correct password clears that account's counter.
- **Per address** — fifty, so one host spraying many accounts is slowed. Deliberately loose,
  because the classroom case is a whole lab behind one NAT address: this is a runaway guard
  against automation, not a per-student limit. Set `DZ_LOGIN_IP_LIMIT=0` to disable it on a
  deployment behind a large shared address.

The check runs before the password is verified, so a throttled attempt costs no `scrypt` work
and a correct password is refused while an account is shut. Refusals are 429 with a
`Retry-After` header and a message the sign-in form renders, and are recorded in the audit
trail as `auth.login_throttled` — an operator watching for lockouts should not have to infer
them from a run of ordinary failures.

## Scope and safety

Everything here is coursework. The practical work happens inside an isolated lab that the
student owns, and each module says so explicitly. Unauthorized access to a system is a
criminal offence under the CFAA (18 U.S.C. § 1030), the UK Computer Misuse Act 1990, EU
Directive 2013/40/EU, and equivalent statutes elsewhere; nothing in this repository is
authorization to test anything.

This is a legitimate professional teaching model — the same one used by university
red-team tracks and commercial security training — not a set of instructions for use
against systems the reader does not own.
