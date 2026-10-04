import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

/*
 * Curriculum content lives as markdown-with-frontmatter under content/modules/.
 * A teacher can author a module by dropping in a file; this module validates it
 * and exposes it to the app. Nothing about a module is hard-coded here.
 */

const LabStep = z.object({
  do: z.string(),
  expect: z.string().optional(),
});

const Lab = z.object({
  name: z.string(),
  /* sandbox: throwaway VM we own. host: our own single machine. analysis: we
   * inspect an artifact we generated. read-only: we only look at public data. */
  environment: z.enum(['sandbox', 'host', 'analysis', 'read-only']),
  brief: z.string(),
  steps: z.array(LabStep).min(1),
  success: z.array(z.string()).min(1),
  cleanup: z.array(z.string()).default([]),
});

const Ethics = z.object({
  /* The line this module must not cross, stated for the student. */
  boundary: z.string(),
  legal: z.string(),
  disclosure: z.string().optional(),
  /* Optional aside, e.g. the persistence-inventory habit in m08. */
  notes: z.string().optional(),
});

const Question = z.object({
  q: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explain: z.string(),
});

export const ModuleSchema = z.object({
  id: z.string().regex(/^m\d{2}-[a-z0-9-]+$/),
  order: z.number().int().positive(),
  title: z.string(),
  tier: z.enum(['foundation', 'core', 'advanced']),
  minutes: z.number().int().positive(),
  summary: z.string(),
  objectives: z.array(z.string()).min(1),
  mitre: z.array(z.string()).default([]),
  cwe: z.array(z.string()).default([]),
  csf: z.array(z.string()).default([]),
  owasp: z.array(z.string()).default([]),
  attackTechniques: z.array(z.string()).default([]),
  defenses: z.array(z.string()).min(1),
  lab: Lab,
  ethics: Ethics,
  assessment: z.array(Question).min(1),
});

export type Lab = z.infer<typeof Lab>;
export type ModuleMeta = z.infer<typeof ModuleSchema>;
export interface CourseModule extends ModuleMeta {
  body: string;
  sections: Record<string, string>;
}

const CONTENT_DIR = process.env.DZ_CONTENT ?? resolve(process.cwd(), 'content', 'modules');

/* The first modules are readable without an account — the syllabus should be
 * visible to someone deciding whether to enrol. Everything after the limit
 * requires a signed-in user. */
export const FREE_MODULE_LIMIT = 3;

/* Pull "## Heading" blocks out so the UI can show attacker/defender views. */
function splitSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl === -1) continue;
    const heading = part.slice(0, nl).trim().toLowerCase();
    out[heading] = part.slice(nl + 1).trim();
  }
  return out;
}

let cache: CourseModule[] | null = null;

/*
 * Reads markdown at runtime, so the bundler cannot see which files to ship. The
 * turbopackIgnore directives stop Turbopack from tracing (and shipping) the whole
 * project, and next.config.ts declares content/modules for the server trace.
 */
export function loadModules(): CourseModule[] {
  if (cache) return cache;
  if (!existsSync(/* turbopackIgnore: true */ CONTENT_DIR)) return [];

  const modules: CourseModule[] = [];
  const files = readdirSync(/* turbopackIgnore: true */ CONTENT_DIR).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const raw = readFileSync(/* turbopackIgnore: true */ `${CONTENT_DIR}/${file}`, 'utf8');
    const { data, content } = matter(raw);
    const parsed = ModuleSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `content/modules/${file} frontmatter is invalid:\n${parsed.error.issues
          .map((i) => `  ${i.path.join('.')}: ${i.message}`)
          .join('\n')}`,
      );
    }
    modules.push({
      ...parsed.data,
      body: content.trim(),
      sections: splitSections(content),
    });
  }

  modules.sort((a, b) => a.order - b.order);
  cache = modules;
  return modules;
}

export function getModule(id: string): CourseModule | undefined {
  return loadModules().find((m) => m.id === id);
}

export function curriculumStats() {
  const mods = loadModules();
  return {
    modules: mods.length,
    minutes: mods.reduce((n, m) => n + m.minutes, 0),
    labs: mods.length,
    questions: mods.reduce((n, m) => n + m.assessment.length, 0),
    techniques: new Set(mods.flatMap((m) => m.mitre)).size,
  };
}
