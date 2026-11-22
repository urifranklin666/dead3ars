---
id: m12-capstone-and-reporting
order: 12
title: "Capstone: A Full Engagement and Its Report"
tier: advanced
minutes: 180
summary: >-
  The capstone. You will run a complete, authorized engagement against your own lab range -
  recon, access, escalation, persistence, detection - and deliver the two artefacts that
  matter in professional practice: a technical findings report and an executive summary,
  each written for its own reader.
objectives:
  - Plan an engagement with defined scope, rules of engagement, and a stop condition.
  - Execute the full technique chain against a lab you own, recording evidence as you go.
  - Produce a technical report with findings, evidence, and prioritized remediation.
  - Produce an executive summary that a non-technical decision-maker can act on.
mitre: ["T1595", "T1566", "T1190", "T1059.001", "T1547", "T1078", "T1003", "T1046"]
cwe: ["CWE-89", "CWE-284", "CWE-269", "CWE-778"]
csf: ["GV.RM-01", "ID.RA-01", "PR.AA-05", "DE.AE-02", "RS.CO-02"]
owasp: ["A01:2025", "A03:2025", "A05:2025", "A07:2025", "A09:2025"]
attackTechniques:
  - "Active Scanning (T1595)"
  - "Exploit Public-Facing Application (T1190)"
  - "Command and Scripting Interpreter: PowerShell (T1059.001)"
  - "Boot or Logon Autostart Execution (T1547)"
  - "Valid Accounts (T1078)"
defenses:
  - Written authorization and rules of engagement produced before any testing begins
  - Evidence captured at the moment it is observed and reproducible against the documented configuration
  - A detection matrix that names the steps your own defenses missed, rather than claiming coverage
  - Verified cleanup with a written inventory of every persistence mechanism removed
lab:
  name: "Full-chain capstone engagement and executive reporting"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM capstone VM, which chains web enumeration, Linux privilege
    escalation, and persistence hunting on a single isolated target (http://127.0.0.1:8080
    plus local host). You will draft your scope brief first, execute the full chain to
    capture all three flags, and write both a technical finding and a one-page executive
    summary in your notes/submission.
  steps:
    - do: "Before launching the VM, write a brief authorization scope in your module notes (target: isolated dead3ars capstone VM, permitted techniques, stop condition)."
      expect: "A concise scope statement confirming you only test authorized lab assets."
    - do: "Click 'Launch Lab VM' above, read ~/README-LAB.txt, and enumerate http://127.0.0.1:8080 (inspect HTML source for the hidden debug endpoint /api/config) to capture the [web] flag."
      expect: "You discover /api/config, capture FLAG{web_...}, and note the ops_script path (/opt/capstone/deploy.sh)."
    - do: "Check 'sudo -l', abuse the writable /opt/capstone/deploy.sh script to escalate to root, and read /root/capstone-root.flag for the [root] flag."
      expect: "You elevate to root and capture FLAG{root_...}."
    - do: "Switch to defender mode: inspect /etc/cron.d/capstone-persist to uncover the simulated attacker persistence artifact and capture the [persist] flag."
      expect: "You capture FLAG{persist_...} and submit all three capstone flags above."
    - do: "Write your capstone wrap-up (in Notes or your class Assignment submission): a technical findings list with ATT&CK IDs + remediations, plus a plain-language executive summary with top three priorities."
      expect: "Both technical and executive deliverables backed by evidence from your run."
  success:
    - Completed the full chain across web foothold ([web]), root privesc ([root]), and persistence hunt ([persist])
    - Produced both technical remediation findings and a plain-language executive summary
  cleanup:
    - "Click 'Reset VM' or 'Stop VM' when finished to destroy the ephemeral overlay."
ethics:
  boundary: >-
    The capstone is the point at which the whole course's rule is tested: everything is done
    on assets you own, inside a range whose isolation you have verified yourself. The
    authorization document you write is not decoration - it is you stating, in advance, what
    you are allowed to do, and it is the habit that separates a professional from someone who
    technically knows the commands.
  legal: >-
    The complete chain - recon, access, escalation, persistence, credential access - applied to
    any system outside your lab and outside a written engagement is a serious criminal offence
    in essentially every jurisdiction that has computer-misuse law, and often a civil one as
    well. Note also that a report describing an intrusion you performed without authorization
    is not protection; it is evidence. Authorization must come before the activity, from
    someone entitled to grant it, and must name the systems in scope.
  disclosure: >-
    The capstone report is a private deliverable. If you adapt a finding into a public
    write-up - a blog post, a portfolio piece - describe your own lab and your own
    configuration, generalize the technique, and remove anything that identifies a real
    system, a real employer, or a real vulnerability that has not been fixed. Publishing a
    working exploit for someone else's unpatched system is not research.
assessment:
  - q: "You are writing the rules of engagement for your capstone. Which element is most often omitted and most often consequential?"
    options:
      - "The list of tools to be used."
      - "The stop condition and the out-of-scope list - what happens if you accidentally reach something you should not, and what you must not touch even if you can."
      - "The report format."
      - "The testing schedule."
    answer: 1
    explain: >-
      Scope is usually stated; limits are usually not. A tester who reaches an unplanned host
      needs a pre-agreed instruction about what to do next, and the out-of-scope list is what
      keeps an engagement from becoming an incident. Writing these before starting is what
      forces the tester to think about the boundary rather than discover it mid-test.
  - q: "Which statement belongs in the executive summary rather than the technical report?"
    options:
      - "CWE-89 SQL injection in the search parameter of the reporting portal on host lab-svc-01."
      - "An attacker on the office network could reach the finance system's search function and read other customers' records; fixing this is the highest-priority action."
      - "T1190 with a request captured at 14:22:07."
      - "The parameterised query fix was verified at 16:05."
    answer: 1
    explain: >-
      The executive summary states business risk and priority; the technical report states
      vulnerability class, affected asset, evidence, and remediation. Mixing them produces a
      document that satisfies neither reader - which is the most common failure of a first
      professional report, and the reason both artefacts are required here.
  - q: "After the engagement you cannot find a persistence mechanism you know you created. What is the correct action?"
    options:
      - "Note it as 'cleaned up' and move on."
      - "Treat it as an open critical item: hunt it until it is found or the range is rebuilt from a known-good image, and disclose the gap in the report."
      - "Reboot and assume it is gone."
      - "Delete the VM silently."
    answer: 1
    explain: >-
      An unaccounted-for persistence mechanism is precisely the vulnerability the previous
      module warned about, and it is worse than one you knowingly left because you cannot
      remove what you cannot find. Rebuilding from a known-good image and stating the gap is
      the responsible outcome; the failure to find it is itself a finding about your practice.
  - q: "Your detection matrix shows that initial access via the exposed service produced no alert at all. How should this be presented?"
    options:
      - "As a testing mistake."
      - "As a high-severity finding about visibility: the organization would not have detected the entry point, and the missing telemetry is permanent until collection is fixed."
      - "As a low-priority note."
      - "It should be omitted to keep the report focused on exploitable issues."
    answer: 1
    explain: >-
      Detection gaps rank with vulnerabilities because they determine whether the next
      incident is discovered at all. A blind entry point means every later control is
      operating without warning. Reporting capability gaps alongside exploitable flaws is what
      distinguishes an assessment from a scan.
  - q: "Which is the best evidence to attach to a finding?"
    options:
      - "A screenshot of a scanner's summary page."
      - "The specific request and response, or the specific command and its output, captured at the time and reproducible against the documented configuration."
      - "A verbal description of what you observed."
      - "A link to a tool's documentation."
    answer: 1
    explain: >-
      Reproducibility is the test of evidence. A scanner's verdict is a claim about a
      configuration you may not understand; the raw exchange shows the exact condition and
      lets the engineer confirm the fix. Evidence collected at the time is also evidence whose
      integrity you can defend, which is what module 10 established about handling artefacts.
---

Twelve modules ago you learned that a programmable keyboard can type into a locked machine.
You finish by running a whole engagement and writing it up, because the techniques were
never the point: the point is being able to do authorized work and explain it to the people
who have to make decisions about it.

## Scenario

You are both the tester and the owner of a small range: a workstation and a service host,
on an isolated network, with logging enabled. You will write your own authorization
document, execute the chain the course has taught, examine your own defenses' telemetry, and
deliver a report. Nothing touches a system you do not own; nothing leaves the lab.

## Attacker's view

The capstone is where the fragmented techniques become a campaign, and where the discipline
matters more than any single trick.

**Plan first.** The engagement brief is written before anything is touched: what is in
scope, what is out, which techniques are permitted, when to stop, who to call if something
goes wrong. Every professional engagement starts here, and the document is what makes the
activity lawful.

**Chain the techniques.** Reconnaissance identifies the exposed service; the service yields a
foothold; the foothold yields credentials, which yield reach; reach yields the target. Each
step is recorded at the time it happens, with the raw evidence attached — not reconstructed
from memory afterwards, which is where detail and credibility are lost.

**Assume you are being watched.** Check each step against your own detections as you go.
Which ones would a defender have seen? This is the habit that separates an operator from a
script-runner.

## Defender's view

The deliverable is the report, and a report has two readers with incompatible needs.

**The technical reader** wants findings by severity, each with: the affected asset, the
vulnerability class and CWE, the evidence, the ATT&CK technique where relevant, and a
specific remediation. "Improve password policy" is not a remediation. "Require
phishing-resistant MFA for administrative accounts on the finance VLAN by [date]" is.

**The decision-maker** wants one page: what the exercise demonstrated, what the business
risk is in plain language, and the three actions to take first, with an owner. No CVE
numbers, no tool names, no exploit narration.

The **detection matrix** sits between them and belongs in both, adapted: for every technique
attempted, did it produce an alert, and did a human act? The steps that produced nothing are
the most valuable findings in the document, because they are permanent until the collection
is fixed.

And then the least glamorous step, which is the one that most distinguishes a professional:
**cleanup, verified.** Every persistence mechanism removed, every account and file you
created deleted, every snapshot restored, and a written inventory of what was removed.
Persistence you cannot account for is a breach you caused.

## Key concepts

**Authorization precedes activity.** The engagement brief is written first, names the assets
in scope, and includes a stop condition.

**Two readers, two documents.** Technical findings for the engineer; one page of business
risk and prioritized actions for the decision-maker.

**Detection gaps are findings.** A technique that produced no alert is a permanent capability
gap until collection is fixed.

**Evidence collected at the time.** A screenshot is not evidence; a reproducible exchange,
captured and hashed, is.

**Verified cleanup is part of the deliverable.** Not an afterthought, not a hope.

## Further reading

- NIST SP 800-115 (technical testing) and SP 800-61 (incident handling), for process.
- PTES (Penetration Testing Execution Standard) and the OWASP Testing Guide, for engagement
  structure.
- Any published professional penetration test template, read critically for how findings and
  remediation are separated from exploit narration.
