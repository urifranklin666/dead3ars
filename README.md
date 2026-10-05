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
npm run test:smoke        # end-to-end HTTP test (needs the server running)
npm run test:visual       # computed-style check (needs Chrome; see below)
```

### The tests

`npm run test:smoke` drives the running server over real HTTP and asserts the
security-relevant behaviour, not just the happy path: that the answer explanations are absent
from the rendered HTML, that grading is server-side, that a client cannot self-report a passed
assessment, that a student is refused the teacher API, and that progress, notes, and sessions
behave. 44 checks.

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

## Scope and safety

Everything here is coursework. The practical work happens inside an isolated lab that the
student owns, and each module says so explicitly. Unauthorized access to a system is a
criminal offence under the CFAA (18 U.S.C. § 1030), the UK Computer Misuse Act 1990, EU
Directive 2013/40/EU, and equivalent statutes elsewhere; nothing in this repository is
authorization to test anything.

This is a legitimate professional teaching model — the same one used by university
red-team tracks and commercial security training — not a set of instructions for use
against systems the reader does not own.
