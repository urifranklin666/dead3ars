import crypto from 'node:crypto';
import { db, findUserById } from './db';
import { recordProgress } from './progress';

export interface ScenarioFlagDef {
  key: string;
  label: string;
  hint: string;
}

export interface ScenarioDef {
  moduleId: string;
  title: string;
  ramMb: number;
  vcpus: number;
  flags: ScenarioFlagDef[];
}

export const SCENARIOS: Record<string, ScenarioDef> = {
  'm02-lab-hygiene': {
    moduleId: 'm02-lab-hygiene',
    title: 'Lab Isolation & Secret Permissions Hygiene',
    ramMb: 1024,
    vcpus: 1,
    flags: [
      { key: 'iso', label: 'Network Isolation Check', hint: 'Run /opt/lab-check/verify-hygiene.sh' },
      { key: 'perm', label: 'Harden Secret File', hint: 'chmod 600 ~/.secrets.env and re-run verify-hygiene.sh' },
    ],
  },
  'm04-recon-osint': {
    moduleId: 'm04-recon-osint',
    title: 'Simulated Corporate Recon & OSINT Sandbox',
    ramMb: 1280,
    vcpus: 1,
    flags: [
      { key: 'robots', label: 'Robots Enumeration', hint: 'Inspect http://127.0.0.1:8080/robots.txt' },
      { key: 'meta', label: 'Security Metadata', hint: 'Inspect /.well-known/security.txt' },
      { key: 'dns', label: 'Leaked DNS Zone', hint: 'Discover /backup/dns-zone.txt from page source' },
    ],
  },
  'm05-hid-injection': {
    moduleId: 'm05-hid-injection',
    title: 'HID / BadUSB Payload Analysis & USB Audit',
    ramMb: 1024,
    vcpus: 1,
    flags: [
      { key: 'decode', label: 'Decode Stage-2 Payload', hint: 'Base64-decode payload in /opt/hid-samples/payload.dd' },
      { key: 'usb', label: 'Rogue Device Audit', hint: 'Extract SerialNumber from /opt/hid-samples/usb-audit.log' },
    ],
  },
  'm06-initial-access': {
    moduleId: 'm06-initial-access',
    title: 'Phishing Email & Malicious Attachment Triage',
    ramMb: 1024,
    vcpus: 1,
    flags: [
      { key: 'header', label: 'Email Header IOC', hint: 'Inspect X-Campaign-ID in /opt/triage/phish.eml' },
      { key: 'ioc', label: 'Deobfuscate C2 Dropper', hint: 'Hex-decode ENC in /opt/triage/invoice_2026.sh' },
    ],
  },
  'm07-web-app-attacks': {
    moduleId: 'm07-web-app-attacks',
    title: 'Vulnerable Web Portal (SQLi, IDOR, Session Auth)',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'sqli', label: 'SQL Injection', hint: 'Extract admin secret via /search' },
      { key: 'idor', label: 'Broken Access Control', hint: 'Read Admin Vault note via /notes?id=1' },
      { key: 'auth', label: 'Session Forgery', hint: 'Access /admin with forged admin session cookie' },
    ],
  },
  'm08-privesc-persistence': {
    moduleId: 'm08-privesc-persistence',
    title: 'Linux Privilege Escalation & Persistence Hunt',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'user', label: 'User Foothold', hint: 'Read /home/student/user.flag' },
      { key: 'root', label: 'Root Escalation', hint: 'Check sudo -l and read /root/root.flag' },
      { key: 'hunt', label: 'Persistence Hunt', hint: 'Find HUNT_FLAG in /etc/cron.d/' },
    ],
  },
  'm09-detection-blue-team': {
    moduleId: 'm09-detection-blue-team',
    title: 'Live Beacon Hunting & Blue-Team Triage',
    ramMb: 1280,
    vcpus: 1,
    flags: [
      { key: 'alert', label: 'High-Severity Alert', hint: 'Find T1059.004 alert_id in /var/log/blue-team-alerts.jsonl' },
      { key: 'proc', label: 'Rogue Listener Service', hint: 'Locate port 4444 process & inspect rogue-beacon.service' },
    ],
  },
  'm10-log-analysis-forensics': {
    moduleId: 'm10-log-analysis-forensics',
    title: 'Incident Log Analysis & Forensics',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'ip', label: 'Initial Access Token', hint: 'Inspect /var/evidence/access.log' },
      { key: 'path', label: 'Staging Archive', hint: 'Inspect /var/evidence/auth.log' },
      { key: 'exfil', label: 'DNS Exfiltration', hint: 'Inspect /var/evidence/exfil-manifest.json' },
    ],
  },
  'm11-ai-llm-attack-surface': {
    moduleId: 'm11-ai-llm-attack-surface',
    title: 'AI / LLM Prompt Injection & Excessive Agency Lab',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'prompt', label: 'Direct Prompt Injection', hint: 'Leak system prompt via http://127.0.0.1:8080/chat' },
      { key: 'indirect', label: 'Indirect Injection', hint: 'Trigger override in /summarize with untrusted doc' },
      { key: 'tool', label: 'Tool Abuse', hint: 'Exploit unsanitized input in /tool' },
    ],
  },
  'm12-capstone-and-reporting': {
    moduleId: 'm12-capstone-and-reporting',
    title: 'Full-Chain Capstone (Web → Privesc → Persistence Hunt)',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'web', label: 'Web Foothold', hint: 'Enumerate http://127.0.0.1:8080 for /api/config' },
      { key: 'root', label: 'Root Escalation', hint: 'Escalate via sudo -l (/opt/capstone/deploy.sh)' },
      { key: 'persist', label: 'Persistence Hunt', hint: 'Find PERSIST_FLAG in /etc/cron.d/capstone-persist' },
    ],
  },
  'm13-api-auth-jwt-attacks': {
    moduleId: 'm13-api-auth-jwt-attacks',
    title: 'Modern API, OAuth, and JWT Security',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'bola', label: 'Broken Object Level Auth', hint: 'Query /api/invoices/1001 with alice JWT to trigger BOLA' },
      { key: 'mass_assign', label: 'Mass Assignment Escalation', hint: 'POST /api/profile with role=admin, then GET /api/staff/secret' },
      { key: 'jwt', label: 'JWT alg: none Forgery', hint: 'Forge unsigned JWT with alg:none header against /api/superadmin' },
    ],
  },
  'm14-network-packet-analysis': {
    moduleId: 'm14-network-packet-analysis',
    title: 'Network Traffic and Packet Forensics',
    ramMb: 1280,
    vcpus: 1,
    flags: [
      { key: 'creds', label: 'Cleartext Credential Leak', hint: 'Filter tcpdump on port 21 or 80 to find FLAG_CREDS' },
      { key: 'http_exfil', label: 'HTTP Exfiltration', hint: 'Inspect HTTP POST body in the capture' },
      { key: 'dns_tunnel', label: 'DNS Tunnel Query', hint: 'Decode long subdomain label from DNS traffic on port 53' },
    ],
  },
  'm15-container-cloud-security': {
    moduleId: 'm15-container-cloud-security',
    title: 'Containers, CI/CD, and Cloud Identity',
    ramMb: 1280,
    vcpus: 1,
    flags: [
      { key: 'ci_secret', label: 'Leaked CI/CD Secret', hint: 'Audit /opt/ci-runner/build.log for unmasked deployment secret' },
      { key: 'metadata', label: 'IMDSv1 Metadata Theft', hint: 'Query http://127.0.0.1:8080/latest/meta-data/iam/security-credentials/' },
      { key: 'escape', label: 'Container Host Escape', hint: 'Inspect /opt/deploy/docker-compose.yml for privileged + socket mount' },
    ],
  },
  'm16-binary-malware-triage': {
    moduleId: 'm16-binary-malware-triage',
    title: 'Static and Dynamic Binary Triage',
    ramMb: 1024,
    vcpus: 1,
    flags: [
      { key: 'strings', label: 'Embedded Strings IOC', hint: 'strings /opt/samples/dropper | grep -i flag' },
      { key: 'killswitch', label: 'Kill-Switch Path', hint: 'strace /opt/samples/dropper to find /tmp/.killswitch_XXXXX' },
      { key: 'runtime', label: 'Runtime Artifact', hint: 'Base64-decode /tmp/.malware_runtime' },
    ],
  },
  'm17-ransomware-incident-response': {
    moduleId: 'm17-ransomware-incident-response',
    title: 'Ransomware Incident Response and Recovery',
    ramMb: 1536,
    vcpus: 2,
    flags: [
      { key: 'contain', label: 'Contain Rogue Encryptor', hint: 'Inspect /etc/systemd/system/mock-ransom.service' },
      { key: 'root_cause', label: 'Root Cause Analysis', hint: 'Read /var/log/ir-timeline.log for initial access vector' },
      { key: 'recover', label: 'Verified Backup Recovery', hint: 'sha256sum -c /var/backups/immutable/manifest.sha256' },
    ],
  },
};

export function getScenario(moduleId: string): ScenarioDef | undefined {
  return SCENARIOS[moduleId];
}

export function listScenarios(): ScenarioDef[] {
  return Object.values(SCENARIOS);
}

function labdUrl(): string {
  return (process.env.DZ_LABD_URL || 'http://host.docker.internal:8845').replace(/\/$/, '');
}

function labdSecret(): string {
  const s = process.env.DZ_LABD_SECRET || '';
  if (!s) throw new Error('DZ_LABD_SECRET is not configured');
  return s;
}

async function labdFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${labdUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Labd-Secret': labdSecret(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `labd error (${res.status})`);
  }
  return data as T;
}

export interface LabInstanceRow {
  id: string;
  user_id: number;
  module_id: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  flags_json: string;
  captured_json: string;
  started_at: string;
  last_activity_at: string;
  expires_at: string;
  stopped_at: string | null;
  stop_reason: string;
}

export interface PublicLabState {
  id: string;
  userId: number;
  moduleId: string;
  status: string;
  captured: string[];
  totalFlags: number;
  flags: ScenarioFlagDef[];
  startedAt: string;
  expiresAt: string;
}

export function logLabEvent(
  labId: string,
  userId: number | null,
  moduleId: string,
  eventType: string,
  detail = '',
): void {
  db()
    .prepare(
      'INSERT INTO lab_events (lab_id, user_id, module_id, event_type, detail) VALUES (?, ?, ?, ?, ?)',
    )
    .run(labId, userId, moduleId, eventType, detail);
}

export function getLabRow(labId: string): LabInstanceRow | undefined {
  return db().prepare('SELECT * FROM lab_instances WHERE id = ?').get(labId) as LabInstanceRow | undefined;
}

export function toPublicLab(row: LabInstanceRow): PublicLabState {
  const scenario = getScenario(row.module_id);
  const captured = JSON.parse(row.captured_json || '[]') as string[];
  return {
    id: row.id,
    userId: row.user_id,
    moduleId: row.module_id,
    status: row.status,
    captured,
    totalFlags: scenario?.flags.length ?? 0,
    flags: scenario?.flags ?? [],
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
}

function generateFlags(scenario: ScenarioDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of scenario.flags) {
    out[f.key] = `FLAG{${f.key}_${crypto.randomBytes(6).toString('hex')}}`;
  }
  return out;
}

export async function getActiveLabForUser(userId: number, moduleId?: string): Promise<PublicLabState | null> {
  const row = (moduleId
    ? db()
        .prepare("SELECT * FROM lab_instances WHERE user_id = ? AND module_id = ? AND status IN ('starting','running') ORDER BY started_at DESC LIMIT 1")
        .get(userId, moduleId)
    : db()
        .prepare("SELECT * FROM lab_instances WHERE user_id = ? AND status IN ('starting','running') ORDER BY started_at DESC LIMIT 1")
        .get(userId)) as LabInstanceRow | undefined;

  if (!row) return null;

  try {
    await labdFetch(`/labs/${row.id}`);
    return toPublicLab(row);
  } catch {
    db()
      .prepare("UPDATE lab_instances SET status = 'stopped', stopped_at = datetime('now'), stop_reason = 'expired' WHERE id = ?")
      .run(row.id);
    return null;
  }
}

export async function startOrResumeLab(userId: number, moduleId: string): Promise<PublicLabState> {
  const scenario = getScenario(moduleId);
  if (!scenario) throw new Error(`No interactive lab scenario for ${moduleId}`);

  const existingSame = await getActiveLabForUser(userId, moduleId);
  if (existingSame) return existingSame;

  const other = await getActiveLabForUser(userId);
  if (other) {
    await stopLab(other.id, userId, 'switched_module');
  }

  const labId = `lab_${userId}_${crypto.randomBytes(5).toString('hex')}`;
  const flags = generateFlags(scenario);

  const info = await labdFetch<{ expiresAt: string }>('/labs', {
    method: 'POST',
    body: JSON.stringify({
      labId,
      userId,
      moduleId,
      flags,
      ramMb: scenario.ramMb,
      vcpus: scenario.vcpus,
    }),
  });

  db()
    .prepare(
      `INSERT INTO lab_instances (id, user_id, module_id, status, flags_json, captured_json, expires_at)
       VALUES (?, ?, ?, 'running', ?, '[]', ?)`,
    )
    .run(labId, userId, moduleId, JSON.stringify(flags), info.expiresAt);

  recordProgress(userId, moduleId, 'engaged');
  logLabEvent(labId, userId, moduleId, 'lab_started', scenario.title);

  return toPublicLab(getLabRow(labId)!);
}

export async function resetLab(labId: string, actorId: number): Promise<PublicLabState> {
  const row = getLabRow(labId);
  if (!row) throw new Error('Lab not found');
  const scenario = getScenario(row.module_id);
  if (!scenario) throw new Error('Scenario not found');

  const flags = JSON.parse(row.flags_json || '{}') as Record<string, string>;
  const info = await labdFetch<{ expiresAt: string }>(`/labs/${labId}/reset`, {
    method: 'POST',
    body: JSON.stringify({
      labId,
      userId: row.user_id,
      moduleId: row.module_id,
      flags,
      ramMb: scenario.ramMb,
      vcpus: scenario.vcpus,
    }),
  });

  db()
    .prepare("UPDATE lab_instances SET status = 'running', expires_at = ?, last_activity_at = datetime('now') WHERE id = ?")
    .run(info.expiresAt, labId);

  logLabEvent(labId, actorId, row.module_id, 'lab_reset', 'VM reset to clean snapshot');
  return toPublicLab(getLabRow(labId)!);
}

export async function setLabPaused(labId: string, actorId: number, pause: boolean): Promise<void> {
  const row = getLabRow(labId);
  if (!row) throw new Error('Lab not found');
  await labdFetch(`/labs/${labId}/${pause ? 'pause' : 'resume'}`, { method: 'POST' });
  logLabEvent(labId, actorId, row.module_id, pause ? 'lab_paused' : 'lab_resumed', pause ? 'Paused by teacher' : 'Resumed by teacher');
}

export async function setAllLabsPaused(actorId: number, pause: boolean): Promise<number> {
  const res = await labdFetch<{ count: number }>(`/labs/${pause ? 'pause-all' : 'resume-all'}`, { method: 'POST' });
  logLabEvent('all', actorId, 'all', pause ? 'pause_all' : 'resume_all', `${pause ? 'Paused' : 'Resumed'} ${res.count} VM(s)`);
  return res.count;
}

export async function getLabTranscript(labId: string): Promise<string> {
  const res = await labdFetch<{ transcript: string }>(`/labs/${labId}/transcript`);
  return res.transcript || '';
}

export async function stopLab(labId: string, actorId: number, reason = 'stopped'): Promise<void> {
  const row = getLabRow(labId);
  try {
    await labdFetch(`/labs/${labId}`, { method: 'DELETE' });
  } catch {
    // Already gone
  }
  if (row) {
    db()
      .prepare("UPDATE lab_instances SET status = 'stopped', stopped_at = datetime('now'), stop_reason = ? WHERE id = ?")
      .run(reason, labId);
    logLabEvent(labId, actorId, row.module_id, 'lab_stopped', reason);
  }
}

export async function launchLabsForClass(
  classId: number,
  moduleId: string,
  actorId: number,
): Promise<{ launched: number; errors: string[] }> {
  const students = db()
    .prepare('SELECT student_id FROM enrollments WHERE class_id = ?')
    .all(classId) as unknown as { student_id: number }[];

  let launched = 0;
  const errors: string[] = [];
  for (const s of students) {
    try {
      await startOrResumeLab(s.student_id, moduleId);
      launched++;
    } catch (e) {
      errors.push(`student #${s.student_id}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }
  logLabEvent('class', actorId, moduleId, 'class_launch', `Launched ${launched}/${students.length} VM(s) for class #${classId}`);
  return { launched, errors };
}

export function mintLabTicket(params: {
  labId: string;
  userId: number;
  role: string;
  mode: 'ro' | 'rw';
}): string {
  const payload = { ...params, exp: Date.now() + 60_000 };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto.createHmac('sha256', labdSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

function syncAutoGradebook(userId: number, moduleId: string, capturedCount: number, totalFlags: number): void {
  if (totalFlags <= 0) return;
  const assignments = db()
    .prepare(
      `SELECT a.id FROM assignments a
         JOIN enrollments e ON e.class_id = a.class_id
        WHERE e.student_id = ? AND a.module_id = ?`,
    )
    .all(userId, moduleId) as unknown as { id: number }[];

  const feedback = `Auto-graded from live cyber-range flags (${capturedCount}/${totalFlags})`;
  for (const a of assignments) {
    db()
      .prepare(
        `INSERT INTO grades (assignment_id, student_id, score, max, feedback, graded_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(assignment_id, student_id)
         DO UPDATE SET score = MAX(grades.score, excluded.score),
                       max = excluded.max,
                       feedback = excluded.feedback,
                       graded_at = excluded.graded_at`,
      )
      .run(a.id, userId, capturedCount, totalFlags, feedback);
  }
}

export function submitLabFlag(
  userId: number,
  labId: string,
  submitted: string,
): { correct: boolean; flagKey?: string; alreadyCaptured?: boolean; allCaptured: boolean; captured: string[] } {
  const row = getLabRow(labId);
  if (!row || row.user_id !== userId) throw new Error('Lab not found');

  const trimmed = submitted.trim();
  const flags = JSON.parse(row.flags_json || '{}') as Record<string, string>;
  const captured = new Set<string>(JSON.parse(row.captured_json || '[]') as string[]);

  let matchedKey: string | undefined;
  for (const [k, expected] of Object.entries(flags)) {
    const a = Buffer.from(trimmed);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      matchedKey = k;
      break;
    }
  }

  if (!matchedKey) {
    logLabEvent(labId, userId, row.module_id, 'flag_invalid', 'Incorrect flag attempt');
    return { correct: false, allCaptured: false, captured: [...captured] };
  }

  const alreadyCaptured = captured.has(matchedKey);
  captured.add(matchedKey);
  const capturedArr = [...captured];
  const totalFlags = Object.keys(flags).length;
  const allCaptured = totalFlags > 0 && capturedArr.length >= totalFlags;

  db()
    .prepare("UPDATE lab_instances SET captured_json = ?, last_activity_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(capturedArr), labId);

  if (!alreadyCaptured) {
    logLabEvent(labId, userId, row.module_id, 'flag_captured', `Captured ${matchedKey} (${capturedArr.length}/${totalFlags})`);
    syncAutoGradebook(userId, row.module_id, capturedArr.length, totalFlags);
  }
  if (allCaptured) {
    recordProgress(userId, row.module_id, 'lab-complete');
    logLabEvent(labId, userId, row.module_id, 'lab_completed', 'All scenario flags captured');
  }

  return { correct: true, flagKey: matchedKey, alreadyCaptured, allCaptured, captured: capturedArr };
}

export interface LiveLabTelemetry {
  labId: string;
  userId: number;
  studentName: string;
  studentEmail: string;
  moduleId: string;
  status: string;
  paused: boolean;
  rssMb: number;
  ramMb: number;
  vcpus: number;
  startedAt: string;
  expiresAt: string;
  idleSeconds: number;
  ttyClients: number;
  vncClients: number;
  teacherWatchers: number;
  vncReady: boolean;
  captured: string[];
  totalFlags: number;
}

export async function teacherLabsSnapshot() {
  const live = await labdFetch<{
    labs: Array<{
      labId: string;
      userId: number;
      moduleId: string;
      status: string;
      paused?: boolean;
      rssMb: number;
      ramMb: number;
      vcpus: number;
      startedAt: string;
      expiresAt: string;
      idleSeconds: number;
      ttyClients: number;
      vncClients: number;
      teacherWatchers: number;
      vncReady: boolean;
    }>;
    maxLabs: number;
    guiImageReady: boolean;
  }>('/labs');

  const items: LiveLabTelemetry[] = live.labs.map((l) => {
    const row = getLabRow(l.labId);
    const user = findUserById(l.userId);
    const scenario = getScenario(l.moduleId);
    const captured = row ? (JSON.parse(row.captured_json || '[]') as string[]) : [];
    return {
      ...l,
      paused: Boolean(l.paused),
      studentName: user?.name ?? `User #${l.userId}`,
      studentEmail: user?.email ?? '',
      captured,
      totalFlags: scenario?.flags.length ?? 0,
    };
  });

  const events = db()
    .prepare(
      `SELECT e.id, e.lab_id, e.user_id, e.module_id, e.event_type, e.detail, e.created_at,
              COALESCE(u.name, 'System') AS actor_name
         FROM lab_events e
         LEFT JOIN users u ON u.id = e.user_id
        ORDER BY e.id DESC LIMIT 40`,
    )
    .all();

  const classes = db()
    .prepare(
      `SELECT c.id, c.name, c.join_code, COUNT(e.student_id) AS student_count
         FROM classes c
         LEFT JOIN enrollments e ON e.class_id = c.id
        GROUP BY c.id ORDER BY c.name`,
    )
    .all();

  return {
    labs: items,
    maxLabs: live.maxLabs,
    guiImageReady: live.guiImageReady,
    totalRssMb: items.reduce((n, l) => n + l.rssMb, 0),
    events,
    classes,
    scenarios: listScenarios().map((s) => ({ moduleId: s.moduleId, title: s.title })),
  };
}

export interface LabdHealth {
  ok: boolean;
  activeLabs: number;
  maxLabs: number;
  guiImageReady: boolean;
  scenarios: number;
  error?: string;
}

export async function labdHealth(): Promise<LabdHealth> {
  const scenarios = listScenarios().length;
  try {
    const res = await fetch(`${labdUrl()}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return { ok: false, activeLabs: 0, maxLabs: 0, guiImageReady: false, scenarios, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { ok?: boolean; activeLabs?: number; maxLabs?: number; guiImageReady?: boolean };
    return {
      ok: Boolean(data.ok),
      activeLabs: Number(data.activeLabs ?? 0),
      maxLabs: Number(data.maxLabs ?? 0),
      guiImageReady: Boolean(data.guiImageReady),
      scenarios,
    };
  } catch (e) {
    return {
      ok: false,
      activeLabs: 0,
      maxLabs: 0,
      guiImageReady: false,
      scenarios,
      error: e instanceof Error ? e.message : 'unreachable',
    };
  }
}

export async function killAllLabs(actorId: number): Promise<number> {
  const res = await labdFetch<{ stopped: number }>('/labs', { method: 'DELETE' });
  db()
    .prepare("UPDATE lab_instances SET status = 'stopped', stopped_at = datetime('now'), stop_reason = 'kill_all' WHERE status IN ('starting','running')")
    .run();
  logLabEvent('all', actorId, 'all', 'kill_all', `Terminated ${res.stopped} active lab(s)`);
  return res.stopped;
}
