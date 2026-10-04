import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import { ModuleSchema } from '../src/lib/curriculum';

/*
 * Validates every module's frontmatter and reports curriculum shape. Run this in
 * CI and locally after editing content — a malformed module otherwise only fails
 * at request time.
 */
const dir = resolve(process.cwd(), 'content', 'modules');

let failures = 0;
const ids = new Set<string>();
const rows: string[] = [];

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

console.log('\ndead3ars curriculum check\n');
check('content/modules exists', readdirSync(dir, { withFileTypes: true }) !== null);

const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
check('at least one module', files.length > 0, `${files.length} file(s)`);

for (const file of files) {
  const raw = readFileSync(join(dir, file), 'utf8');
  const { data, content } = matter(raw);
  const parsed = ModuleSchema.safeParse(data);

  if (!parsed.success) {
    check(`${file}: frontmatter valid`, false, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    continue;
  }
  const m = parsed.data;

  if (ids.has(m.id)) check(`${file}: id unique`, false, `duplicate id ${m.id}`);
  ids.add(m.id);

  check(`${file}: id matches filename`, file === `${m.id}.md`, `id=${m.id}`);

  /* Answer indices must be in range or the quiz cannot be graded. */
  const badAnswer = m.assessment.findIndex((q) => q.answer >= q.options.length || q.answer < 0);
  check(`${file}: every answer index in range`, badAnswer === -1, badAnswer === -1 ? '' : `question ${badAnswer + 1}`);

  /* Every question needs the "after grading" explanation that makes it teach. */
  const noExplain = m.assessment.filter((q) => q.explain.trim().length < 20).length;
  check(`${file}: every question has a real explanation`, noExplain === 0, noExplain ? `${noExplain} thin` : '');

  /* Defence pairing is what keeps this a security course, not an exploit dump. */
  check(`${file}: has at least one defensive control`, m.defenses.length >= 1);
  check(`${file}: ethics block is specific`, m.ethics.boundary.length > 40 && m.ethics.legal.length > 40);

  /* The lab must be sandboxed or analysis-only; nothing targets third parties. */
  const safeEnv = ['sandbox', 'host', 'analysis', 'read-only'].includes(m.lab.environment);
  check(`${file}: lab environment is constrained`, safeEnv, m.lab.environment);
  check(`${file}: lab has cleanup steps or is read-only`, m.lab.cleanup.length > 0 || m.lab.environment === 'read-only');

  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map((h) => h[1].toLowerCase());
  for (const need of ['scenario', "attacker's view", "defender's view"]) {
    check(`${file}: has "## ${need}"`, headings.some((h) => h.includes(need)));
  }

  rows.push(`  ${String(m.order).padStart(2)}  ${m.id.padEnd(28)} ${m.tier.padEnd(10)} ${String(m.minutes).padStart(4)}m  ${m.mitre.join(',') || '-'}`);
}

console.log(`\ncurriculum:\n${rows.join('\n')}\n`);
console.log(`${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}  (${files.length} modules, ${ids.size} unique ids)\n`);
process.exit(failures === 0 ? 0 : 1);
