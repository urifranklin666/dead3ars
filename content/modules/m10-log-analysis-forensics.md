---
id: m10-log-analysis-forensics
order: 10
title: "Log Analysis and Host Forensics"
tier: advanced
minutes: 120
summary: >-
  An incident has happened and the telemetry is all you have. This module covers reading
  logs as evidence, reconstructing a timeline from host artefacts, and writing the report
  that a non-technical reader can act on.
objectives:
  - Read a system and application log and separate evidence from noise.
  - Reconstruct a timeline of an intrusion from multiple independent artefact sources.
  - Explain the order of volatility and why it governs collection.
  - Write an incident report with findings, impact, and recommendations.
mitre: ["T1070", "T1112", "T1059.001", "T1547.001", "T1486"]
cwe: ["CWE-778", "CWE-693"]
csf: ["DE.AE-04", "DE.AE-06", "RS.AN-03", "RS.AN-06"]
owasp: ["A09:2025"]
attackTechniques:
  - "Indicator Removal (T1070)"
  - "Modify Registry (T1112)"
  - "Command and Scripting Interpreter: PowerShell (T1059.001)"
  - "Boot or Logon Autostart Execution (T1547)"
  - "Data Encrypted for Impact (T1486)"
defenses:
  - Collecting in order of volatility, with hashes and chain of custody recorded as the collection proceeds
  - Building timelines from independent artefact sources and reporting conflicts rather than silently resolving them
  - Centralising and protecting logs off-host, so on-host tampering is not fatal to the investigation
  - Separating observation from attribution, and stating the limits of what the artefacts support
lab:
  name: "Reconstruct an incident from artefacts"
  environment: analysis
  brief: >-
    You are given a pre-captured evidence set from a lab VM on which a scripted intrusion
    ran: host event logs, a process-creation export, and a captured registry hive. You will
    build a timeline, identify the techniques, and write the report. The offensive work was
    done in an earlier module, so this one is read-only.
  steps:
    - do: "Inventory the evidence you have been given and record the capture time of each source. Note what is missing."
      expect: "A list of sources with timestamps and a stated gap - there is always a gap."
    - do: "Query the process-creation export for the intrusion window and order the events."
      expect: "An ordered list of process creations with parents and command lines."
    - do: "Find the first event you can attribute to the intruder with confidence, and state your confidence and the evidence behind it."
      expect: "A defensible start-of-intrusion time, not a guess."
    - do: "Examine the captured registry hive for autostart values, including ones with unusual or recently modified timestamps."
      expect: "Any persistence entries, with the value's last-write time as corroboration."
    - do: "Check for evidence of log tampering or cleared records. What is absent can be as informative as what is present."
      expect: "A statement of whether you can rule out anti-forensic activity, and on what basis."
    - do: "Write the incident report: what happened, in what order, what was affected, what the impact was, and what should change."
      expect: "A report a manager could act on without reading the raw logs."
  success:
    - A timeline built from at least two independent sources, with conflicts noted
    - Each attributed technique named with its ATT&CK ID and the artefact that supports it
    - A written report with findings, impact, and prioritized recommendations
  cleanup:
    - "The evidence set is read-only. Do not modify it - a forensic artefact that has been changed is no longer evidence."
ethics:
  boundary: >-
    This module is entirely read-only analysis. The evidence set is provided, and you do not
    generate new attack activity. If you ever handle real forensic data, it may contain the
    personal information of real people - read only what the investigation requires, and keep
    it inside the case, not in your own notes or a personal cloud drive.
  legal: >-
    Forensic analysis of a system you are not authorised to examine can itself be unlawful,
    and mishandling collected data engages data-protection law in most jurisdictions.
    Evidence integrity also has legal weight: if a matter may reach a court or a disciplinary
    process, chain of custody, hashing, and documented handling are requirements rather than
    good practice, and an examiner who alters originals can render the evidence unusable and
    expose themselves to liability.
  disclosure: >-
    Report findings through the incident process to the system owner, and include what you
    could not determine. Overstating attribution is the classic forensic failure: "the
    evidence is consistent with X" and "X did it" are different claims, and only the first is
    usually supportable from host artefacts alone.
assessment:
  - q: "You are collecting evidence from a running machine. Which order of collection is correct, and why?"
    options:
      - "Disk first, because it holds the most data."
      - "Most volatile first - CPU registers and memory, then network state, then running processes, then disk - because the volatile sources are destroyed by shutdown or by time."
      - "Whatever order is convenient."
      - "Logs first, because they are easiest."
    answer: 1
    explain: >-
      This is the order of volatility. Memory contains material that never reaches disk, and
      it is gone the moment power is lost. Collecting the disk first and the memory later can
      mean the memory is already changed by ongoing activity. Documenting the order and the
      hashes is part of the collection, not an extra step.
  - q: "A log shows a gap of several minutes during the intrusion window. What is the most defensible interpretation?"
    options:
      - "Nothing happened during the gap."
      - "The gap is unexplained - it may indicate log clearing or a service interruption, and it must be reported as a gap rather than assumed to be quiet."
      - "The clock was wrong."
      - "The intruder was not active."
    answer: 1
    explain: >-
      Absence of evidence is not evidence of absence. A gap is a limit on your certainty, and
      a competent report states it. Log clearing is itself a technique (T1070, indicator
      removal), so an unexplained gap during an incident window is potentially the most
      significant finding in the set.
  - q: "Two sources disagree about whether a process ran at 09:14 or 09:22. What should the report do?"
    options:
      - "Pick the more dramatic one."
      - "State both readings, name the sources, and give the most likely explanation such as clock skew - while noting that unresolved, it limits the precision of the timeline."
      - "Average them."
      - "Omit the conflict."
    answer: 1
    explain: >-
      Conflicts between independent sources are normal, and they are informative: they often
      point to time-synchronisation problems that affect the whole investigation. Silently
      choosing one reading destroys the reader's ability to judge reliability - and if the
      matter is ever reviewed, the omission looks like carelessness or worse.
  - q: "Which claim is supportable from host artefacts alone?"
    options:
      - "The intruder works for a specific foreign government."
      - "A scripted process launched from an office application, wrote an autostart entry, and connected to an external address at a stated time."
      - "The intruder intended to cause a specific harm."
      - "The intruder's real name."
    answer: 1
    explain: >-
      Host artefacts support statements about what occurred on the host. Attribution to a
      person, an organisation, or a motive requires evidence from outside the host and usually
      a much higher evidentiary standard. Confusing technical observation with attribution is
      the error that most damages a forensic report's credibility.
  - q: "Which ATT&CK tactic covers an adversary clearing event logs and disabling the telemetry that would have recorded them?"
    options:
      - "Stealth (TA0005)"
      - "Defense Impairment (TA0112)"
      - "Impact (TA0040)"
      - "Collection (TA0009)"
    answer: 1
    explain: >-
      Disabling or modifying the tools that produce evidence sits under Defense Impairment
      (TA0112) — specifically T1685 Disable or Modify Tools, which absorbed the log-clearing
      sub-techniques formerly filed under T1562 "Impair Defenses". It is worth separating from
      Stealth (TA0005), which hides activity without touching the controls, and from T1070
      Indicator Removal, which deletes the artefacts after the fact. All three are
      anti-forensic, and all three have the same practical consequence: they reduce the
      certainty of your timeline rather than your ability to notice that something happened.
---

Attacks leave traces, and the traces are the whole product once the incident is over. This
module is deliberately read-only: the offensive work has already been done, and here you
find out what a defender can reconstruct from it.

## Scenario

A junior analyst hands you a case folder from a lab VM. A scripted intrusion ran on it
during a previous exercise, and the analyst captured the host event logs, a process-creation
export, and the registry hive. They want to know what happened, in what order, and what the
organisation should change. Your job is the report.

## Attacker's view

From the intruder's side, forensics is a race about residue. Anything written to disk stays
until it is overwritten, so the attacker's instinct is to remove indicators (T1070): delete
tools, clear event logs, disable the telemetry that would have recorded them (T1685, under
the Defense Impairment tactic). The technique works, in the sense that it reduces the
defender's certainty — but it rarely
leaves nothing.

It is also conspicuous. Log clearing during an incident window is itself one of the loudest
signals available, and modern collection ships events off the host precisely so that the
local record is not the only copy. The defensive lesson — centralise and protect logs,
because the host's own history is under the attacker's control but your log pipeline is not
— is one of the highest-leverage architecture decisions in security.

## Defender's view

Forensic work is a process with a discipline, and the discipline is what makes the output
admissible and believable.

1. **Collect in order of volatility.** Memory and network state before disk, because they
   disappear first. Hash what you take, record who took it and when. This is chain of
   custody, and it is not bureaucracy — an altered artefact is no longer evidence.
2. **Build the timeline from independent sources.** Process creation, registry last-write
   times, file metadata, network records. When sources agree, confidence rises; when they
   conflict, the conflict itself is a finding.
3. **Report the gaps.** Unexplained absences, clock skew, and missing log types limit what you
   can assert. Stating them is what makes the rest of the report trustworthy.
4. **Separate observation from attribution.** "A process with parent winword.exe launched
   powershell.exe with an encoded argument" is an observation. "A state actor targeted the
   finance team" is a claim requiring evidence from outside this host, and probably not
   supportable at all from these artefacts.
5. **Write for the reader who has to act.** Findings, impact, recommendations — prioritized.
   A technical narrative alone leaves the reader unable to decide what to do on Monday.

The logging failure mode from the previous module returns here in its most expensive form:
if authorization failures and persistence writes were never logged, they cannot be
recovered later, and the report becomes a description of the small part of the intrusion
that happened to leave a record.

## Key concepts

**Order of volatility.** The sequence of collection, dictated by how quickly each source
changes or disappears.

**Absence of evidence is not evidence of absence.** A gap limits certainty; it does not prove
inactivity. Report it.

**Observation versus attribution.** Two different claims with two different evidentiary
burdens, routinely conflated and the most common way a report loses credibility.

**Logs are a control, not an afterthought.** Centralised logs survive on-host tampering, which
is why collection architecture is a security decision.

## Further reading

- NIST SP 800-61 (incident handling) and SP 800-86 (forensic techniques), for the process
  vocabulary this module uses.
- MITRE ATT&CK T1070 Indicator Removal and the Defense Impairment tactic (TA0112), whose T1685
  Disable or Modify Tools covers log tampering, for the anti-forensic techniques.
- Any published DFIR report on a recent intrusion, read as a model for structure and for the
  discipline of separating observation from attribution.
