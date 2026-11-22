#!/usr/bin/env node
/**
 * Sandbox-tests every KVM lab scenario provisioning script in labd/scenarios/
 * against the flag definitions in src/lib/labs.ts.
 *
 * Checks per scenario (both with dynamic FLAG_* env vars and unset defaults):
 *  - bash -n syntax check on the scenario script
 *  - Clean exit (0) under `set -euo pipefail`
 *  - Zero 0-byte generated files
 *  - python3 -m py_compile on all generated Python scripts (by extension or shebang)
 *  - bash -n on all generated Bash scripts (by extension or shebang)
 *  - Zero nested-brace double-closing flags (`FLAG{...}}`)
 *  - Exact presence of every expected flag (plain, hex, base64, or tar.gz)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const LABS_TS = path.join(ROOT, 'src/lib/labs.ts');
const SCENARIOS_DIR = path.join(ROOT, 'labd/scenarios');

const labsSource = fs.readFileSync(LABS_TS, 'utf8');
const scenarios = new Map();
for (const m of labsSource.matchAll(/'(m\d{2}-[a-z0-9-]+)':\s*\{([\s\S]*?)\n  \},/g)) {
  const keys = [...m[2].matchAll(/key:\s*'([a-z0-9_]+)'/g)].map((k) => k[1]);
  scenarios.set(m[1], keys);
}

if (scenarios.size === 0) {
  console.error('FAIL: Could not parse any scenarios from src/lib/labs.ts');
  process.exit(1);
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (entry.name === 'bin_mock') continue;
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const hasPython3 = spawnSync('python3', ['--version']).status === 0;
let failures = 0;

for (const [mod, keys] of [...scenarios.entries()].sort()) {
  const scriptPath = path.join(SCENARIOS_DIR, `${mod}.sh`);
  if (!fs.existsSync(scriptPath)) {
    console.error(`[FAIL] ${mod}: missing ${scriptPath}`);
    failures++;
    continue;
  }

  const syntax = spawnSync('bash', ['-n', scriptPath], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    console.error(`[FAIL] ${mod}: bash -n failed: ${syntax.stderr.trim()}`);
    failures++;
    continue;
  }

  const src = fs.readFileSync(scriptPath, 'utf8');

  for (const mode of ['with_flags', 'defaults']) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `bw-audit-${mod}-${mode}-`));
    try {
      const dirs = [
        'opt', 'var/log', 'var/evidence', 'var/backups/immutable',
        'srv', 'etc/systemd/system', 'etc/cron.d', 'etc/sudoers.d',
        'usr/local/bin', 'root', 'home/student', 'bin_mock',
      ];
      for (const d of dirs) fs.mkdirSync(path.join(tmp, d), { recursive: true });

      for (const cmd of ['systemctl', 'chown', 'visudo']) {
        const mockPath = path.join(tmp, 'bin_mock', cmd);
        fs.writeFileSync(mockPath, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
      }

      let patched = src;
      for (const prefix of ['/opt/', '/var/', '/srv/', '/etc/', '/usr/local/bin/', '/root/', '/home/student']) {
        patched = patched.replaceAll(prefix, path.join(tmp, prefix.replace(/^\//, '')) + (prefix.endsWith('/') ? '/' : ''));
      }
      patched = patched.replaceAll('cd /\n', `cd ${tmp}\n`);

      const env = Object.fromEntries(
        Object.entries(process.env).filter(([k]) => !k.startsWith('FLAG_')),
      );
      env.PATH = `${path.join(tmp, 'bin_mock')}:${env.PATH || ''}`;

      const expectedFlags = {};
      if (mode === 'with_flags') {
        for (const k of keys) {
          const val = `FLAG{${k}_aabbcc112233}`;
          env[`FLAG_${k.toUpperCase()}`] = val;
          expectedFlags[k] = val;
        }
      }

      const run = spawnSync('bash', [], {
        input: patched,
        env,
        encoding: 'utf8',
        timeout: 20_000,
      });

      const issues = [];
      if (run.status !== 0) {
        issues.push(`EXIT ${run.status}: ${(run.stderr || '').trim().slice(0, 200)}`);
      }

      const chunks = [];
      for (const fp of walkFiles(tmp)) {
        const stat = fs.statSync(fp);
        if (stat.size === 0) {
          issues.push(`EMPTY FILE: ${path.relative(tmp, fp)}`);
          continue;
        }
        const buf = fs.readFileSync(fp);
        const txt = buf.toString('utf8');
        chunks.push(txt);

        // Decode embedded hex & base64 payloads so encoded flags are also checked
        for (const hm of txt.matchAll(/[0-9a-fA-F]{40,}/g)) {
          try { chunks.push(Buffer.from(hm[0], 'hex').toString('utf8')); } catch {}
        }
        for (const bm of txt.matchAll(/[A-Za-z0-9+/]{24,}={0,2}/g)) {
          try { chunks.push(Buffer.from(bm[0], 'base64').toString('utf8')); } catch {}
        }
        if (fp.endsWith('.tar.gz')) {
          const tar = spawnSync('tar', ['xzOf', fp], { encoding: 'utf8' });
          if (tar.stdout) chunks.push(tar.stdout);
        }

        const firstLine = txt.split('\n', 1)[0] || '';
        const base = path.basename(fp);
        if (hasPython3 && (base.endsWith('.py') || firstLine.includes('python3'))) {
          const pc = spawnSync('python3', ['-m', 'py_compile', fp], { encoding: 'utf8' });
          if (pc.status !== 0) issues.push(`PY_COMPILE (${base}): ${pc.stderr.trim()}`);
        }
        if (base.endsWith('.sh') || (firstLine.includes('bash') && !base.endsWith('.py'))) {
          const sn = spawnSync('bash', ['-n', fp], { encoding: 'utf8' });
          if (sn.status !== 0) issues.push(`BASH -N (${base}): ${sn.stderr.trim()}`);
        }
      }

      const blob = chunks.join('\n');
      if (/FLAG\{[^}\n]+\}\}/.test(blob)) {
        issues.push('DOUBLE BRACE FLAG{...}} DETECTED');
      }
      for (const [k, val] of Object.entries(expectedFlags)) {
        if (!blob.includes(val)) {
          issues.push(`MISSING FLAG ${k} (${val})`);
        }
      }

      if (issues.length > 0) {
        failures++;
        console.error(`[FAIL] ${mod} (${mode}):`);
        for (const iss of issues) console.error(`  - ${iss}`);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

if (failures > 0) {
  console.error(`\nScenario check FAILED (${failures} failure(s) across ${scenarios.size} scenarios).`);
  process.exit(1);
}

console.log(`✓ All ${scenarios.size} KVM lab scenarios passed (${scenarios.size * 2} sandbox runs).`);
