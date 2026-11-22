import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadModules } from '@/lib/curriculum';
import { getScenario } from '@/lib/labs';
import { moduleHref } from '@/lib/routes';
import { isStaff, viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Instructor Solutions & Answer Key — dead3ars' };

const LAB_TEACHING_NOTES: Record<string, string> = {
  'm02-lab-hygiene':
    'Verify students confirm loopback-only networking before running the audit script, restrict secret file permissions to owner-only, and exercise a VM snapshot reset.',
  'm04-recon-osint':
    'Guide students to separate intentional disclosure metadata from accidental exposure in HTML comments and unreferenced backup files on the local target.',
  'm05-hid-injection':
    'Emphasize safe static inspection of the DuckyScript sample and USB audit log without execution, tying device attributes to USB allowlisting and process-ancestry detection.',
  'm06-initial-access':
    'Walk through sender/Return-Path header alignment failures and safe offline deobfuscation of the attached script artifact, pairing user cues with phishing-resistant MFA.',
  'm07-web-app-attacks':
    'Ensure students demonstrate all three OWASP flaw classes conceptually against the local portal and articulate the exact server-side fix (parameterized queries, ownership checks, signed sessions).',
  'm08-privesc-persistence':
    'Highlight least-privilege delegation: world-writable root-executed helper scripts break sudo boundaries, and cold-start cron enumeration models how defenders hunt persistence.',
  'm09-detection-blue-team':
    'Focus on correlating structured SIEM alerts with live host socket/service inspection, and discuss false-positive tradeoffs when writing detection rules.',
  'm10-log-analysis-forensics':
    'Have students cross-reference timestamps across web, auth, and egress logs to reconstruct a coherent intrusion timeline and identify missing telemetry gaps.',
  'm11-ai-llm-attack-surface':
    'Use the local bot endpoints to illustrate trust-boundary failures between system instructions, untrusted document content, and privileged tool execution.',
  'm12-capstone-and-reporting':
    'Verify students draft scope/authorization notes before launching the box, connect each technical finding to a remediation, and keep the executive summary jargon-free.',
  'm13-api-auth-jwt-attacks':
    'Reinforce the distinction between authentication and object-level authorization, explicit server-side input allowlists, and pinned JWT verification algorithms.',
  'm14-network-packet-analysis':
    'Demonstrate how BPF filters narrow large captures to cleartext auth, anomalous HTTP transfers, and high-entropy DNS labels, then connect to TLS and egress DNS controls.',
  'm15-container-cloud-security':
    'Walk through CI secret hygiene, IMDSv2 session-token and hop-limit protections, and why host socket mounts or privileged containers break isolation.',
  'm16-binary-malware-triage':
    'Reinforce static-before-dynamic triage (hashing, file typing, string review) followed by syscall observation in an air-gapped VM to produce durable behavioral IOCs.',
  'm17-ransomware-incident-response':
    'Stress the IR sequence: rapid containment without wiping volatile logs, root-cause and recovery-inhibition scoping, and checksum-verified restoration from immutable backups.',
};

export default async function TeacherSolutionsPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  const modules = loadModules();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="dz-label text-accent">Instructor only · Staff reference</p>
          <h1 className="text-3xl font-bold tracking-tight">Solutions &amp; Answer Key</h1>
          <p className="text-sm text-muted">
            Server-rendered assessment answer keys and lab teaching guides for all {modules.length}{' '}
            modules. Never exposed to student accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/labs" className="dz-btn dz-btn-primary">
            Live Labs
          </Link>
          <Link href="/teacher" className="dz-btn">
            ← Back to Cohort
          </Link>
        </div>
      </header>

      <nav className="dz-card flex flex-wrap gap-2 p-4" aria-label="Jump to module">
        {modules.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            className="dz-badge dz-badge-neutral px-2 py-1 font-mono text-xs hover:border-accent hover:text-accent"
          >
            {String(m.order).padStart(2, '0')} · {m.id.replace(/^m\d+-/, '')}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {modules.map((m) => {
          const scenario = getScenario(m.id);
          const teachingNote = LAB_TEACHING_NOTES[m.id];
          return (
            <section key={m.id} id={m.id} className="dz-card space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <div>
                  <p className="dz-label font-mono">
                    Module {String(m.order).padStart(2, '0')} · {m.tier}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">{m.title}</h2>
                </div>
                <Link href={moduleHref(m.id)} className="dz-btn py-1 text-xs">
                  Open module →
                </Link>
              </div>

              {(scenario || teachingNote) && (
                <div className="rounded-lg border border-accent/30 bg-panel-2/60 p-4 space-y-3">
                  <p className="dz-label text-accent">Lab Guide &amp; Grading Checkpoints</p>
                  {teachingNote && (
                    <p className="text-sm leading-relaxed text-muted">{teachingNote}</p>
                  )}
                  {scenario && (
                    <div className="space-y-1.5">
                      <p className="font-mono text-xs text-muted">
                        Dynamic per-student flags (generated uniquely at VM spawn):
                      </p>
                      <ul className="space-y-1 text-xs">
                        {scenario.flags.map((f) => (
                          <li key={f.key} className="flex flex-wrap items-baseline gap-2">
                            <span className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-accent-2">
                              [{f.key}]
                            </span>
                            <span className="font-medium">{f.label}</span>
                            <span className="text-muted">— {f.hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <p className="dz-label">Assessment Answer Key ({m.assessment.length} questions)</p>
                <ol className="space-y-3">
                  {m.assessment.map((q, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg border border-line/70 bg-panel-2/40 p-3.5 text-sm space-y-1.5"
                    >
                      <p className="font-medium">
                        <span className="mr-2 font-mono text-xs text-muted">Q{idx + 1}.</span>
                        {q.q}
                      </p>
                      <p className="font-mono text-xs text-accent-2">
                        ✓ Answer: {q.options[q.answer]}
                      </p>
                      <p className="text-xs leading-relaxed text-muted">{q.explain}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
