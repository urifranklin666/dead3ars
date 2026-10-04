---
id: m09-detection-blue-team
order: 9
title: "Detection Engineering and the Blue Team"
tier: advanced
minutes: 120
summary: >-
  An attack that is not detected is not a defended incident. This module turns you around:
  you will take the techniques from the previous four modules and write detections that
  catch them, then measure how noisy and how reliable each detection really is.
objectives:
  - Explain the difference between a log, an alert, and a detection.
  - Write detection logic for a technique you previously executed yourself.
  - Measure a detection's false-positive rate against benign activity.
  - Describe the ATT&CK coverage model and its honest limitations.
mitre: ["T1059.001", "T1547.001", "T1003", "T1190", "T1566"]
cwe: []
csf: ["DE.AE-02", "DE.AE-03", "DE.CM-01", "DE.CM-09"]
owasp: ["A09:2025"]
attackTechniques:
  - "Command and Scripting Interpreter: PowerShell (T1059.001)"
  - "Boot or Logon Autostart Execution (T1547)"
  - "OS Credential Dumping (T1003)"
  - "Exploit Public-Facing Application (T1190)"
defenses:
  - Anchor-and-narrow rule design, where the anchor prevents misses and the narrowing conditions control volume
  - Testing every rule against benign activity before it is relied upon
  - Documenting the evasion each narrowing condition introduces, so the trade-off is explicit
  - Treating missing telemetry as a finding in its own right, since no rule can compensate for absent data
lab:
  name: "Write a detection, then break it"
  environment: sandbox
  brief: >-
    You will re-run two techniques from earlier modules on your lab VM while collecting
    telemetry, write a detection rule for each, then deliberately produce benign activity
    that matches the rule, to measure how much noise you have just created.
  steps:
    - do: "Re-run the HID-injection payload from module 5 on your lab VM with process-creation logging enabled, and export the events."
      expect: "A saved event set you can query against, not a live view you cannot reproduce."
    - do: "From the events, extract the fields that distinguish the injection from a normal user launching a program. A parent process, a command-line fragment, a time clustering - whatever actually separates them."
      expect: "A named set of fields with a stated reason each one separates malicious from benign."
    - do: "Write detection logic as a query over those fields. Keep it as simple as you can while it still fires."
      expect: "A query that fires on the recorded malicious event."
    - do: "Now break it. Perform benign activity that a legitimate user would do and that your query matches - for example, a scheduled script, an admin installing software, a deployment tool launching a shell."
      expect: "Your own query fires on your own benign activity. This is the false positive, and you found it before production did."
    - do: "Refine the detection to remove the false positive without losing the true one. Record what you traded away."
      expect: "A refined rule, plus an explicit note of the evasion it is now blind to."
    - do: "Repeat the exercise for a persistence technique - the Run-key write - and note where the signal is stronger or weaker than process creation."
      expect: "A comparison of signal quality between the two technique families."
  success:
    - Two detection rules, each firing on a technique you executed yourself
    - Each rule tested against benign activity, with the false positive documented
    - A written statement of what each refined rule can no longer catch
  cleanup:
    - "Restore the VM snapshot so the detection VM is clean for the next module."
    - "No detection rule was deployed to any production system."
ethics:
  boundary: >-
    Detection work is defensive, but it still requires the offensive activity that produces
    the telemetry. Run that activity only on your lab VM. Do not deploy detection rules to a
    managed system you do not own - an alert rule is a change to a production environment and
    may itself be a policy violation.
  legal: >-
    Writing detection logic is lawful work. The legal exposure in this module comes entirely
    from the offensive steps that generate the telemetry: those are authorised only on
    systems you own or have written authorization for. Note also that security telemetry
    frequently contains personal data, so collecting and retaining logs from systems with real
    users engages privacy and data-protection obligations, not just security ones.
  disclosure: >-
    If you write a detection that reveals a real gap in a system you are authorised to test -
    say a technique that produces no telemetry at all - report the gap to the owner as a
    finding. A missing log is a finding in its own right, because it is a permanent blind spot
    rather than a one-off error.
  notes: >-
    Keep your detection rules and their false-positive test notes in a file. The written
    trade-off is the artefact an interviewer or an instructor will look at.
assessment:
  - q: "What is the difference between a log entry and a detection?"
    options:
      - "There is none."
      - "A log entry is a recorded fact; a detection is logic that decides the recorded facts mean something worth a human's attention, and it must be measured for accuracy."
      - "A detection is a log with a timestamp."
      - "A detection is only ever written by a vendor."
    answer: 1
    explain: >-
      Logging is collection; detection is judgement. Most organisations have far more logs
      than detections, which is why breaches are often discovered by outsiders rather than by
      the telemetry already sitting in a SIEM. Turning data into a decision, with a measured
      error rate, is the whole job.
  - q: "You write a rule that fires on any process whose parent is explorer.exe. What is the problem?"
    options:
      - "It will never fire."
      - "It fires on every program a user launches normally, because explorer.exe is the shell - the rule has an unusable false-positive rate."
      - "It only works on Linux."
      - "It requires administrator rights."
    answer: 1
    explain: >-
      The parent process alone is far too common a condition. The useful signal was the
      combination: explorer.exe as parent *plus* a command-line interpreter as the child
      *plus* an encoded or otherwise unusual argument. Detection engineering is largely the
      discipline of adding the narrowing conditions that keep the true positive and remove the
      crowds.
  - q: "Why is ATT&CK coverage a poor proxy for actual detection capability?"
    options:
      - "Because ATT&CK is not maintained."
      - "Because a technique can be marked covered by a rule that is never alerted on, is too noisy to triage, or is blind to the specific implementation an adversary would use."
      - "Because coverage tools are expensive."
      - "Because ATT&CK only covers malware."
    answer: 1
    explain: >-
      Coverage is a claim, not a measurement. A rule can exist and never be tuned, or be
      tuned so aggressively that analysts ignore it. The defensible statement of coverage
      comes from testing: execute the technique, see whether the alert fires and whether a
      human acts on it. That is what purple-team exercises, one module from now, are for.
  - q: "A technique on your lab VM produces no telemetry at all. What have you found?"
    options:
      - "Nothing - the technique must have failed."
      - "A blind spot: a permanent, structural gap. This is a finding in its own right, and often more valuable than the attack itself."
      - "A configuration error in your lab."
      - "Proof the technique is safe."
    answer: 1
    explain: >-
      Missing telemetry does not mean nothing happened; it means you would not know if it did.
      Blind spots are permanent until someone fixes the collection, so they outrank
      individual detections in value. This is also why the offensive and defensive skill sets
      are taught together rather than separately.
  - q: "Which field ordering generally gives the most reliable detection of a scripted attack?"
    options:
      - "Alert on the process name alone."
      - "Combine a low-specificity anchor such as a shell process with high-specificity narrowing conditions such as unusual parentage, encoded arguments, or correlated file and registry writes."
      - "Alert on all network connections."
      - "Alert on every file created in the temp directory."
    answer: 1
    explain: >-
      The anchor keeps you from missing the technique; the narrowing conditions keep the alert
      volume survivable. Each narrowing condition is a trade-off, and the trade-off must be
      written down, because it is exactly the set of implementations your detection is now
      blind to - and an adversary will find them.
---

A security team that cannot see an intrusion is not defending anything. This module is where
the course turns around, and it is deliberately placed after the offensive modules: you can
only write a good detection for a technique you have run yourself.

## Scenario

You are on the blue team now. Your lab VM is instrumented, earlier exercises have left
telemetry behind, and your task is to turn that telemetry into detection logic — then to
attack your own logic and find out how easily it breaks.

## Attacker's view

Even from the attacking side, the question that determines success is the same: *what does
this look like from where the defender sits?* An attacker who does not ask it will reuse a
loud technique and be caught. This is why the more capable end of the profession runs
purple exercises with both roles in the same room.

The attacker's advantage is that they only need one path that is unmonitored. The defender
has to cover them all, with finite people and a finite attention span. That asymmetry is the
central fact of detection engineering, and it is why *alert volume* is a security property,
not a nuisance statistic.

## Defender's view

Detection engineering is a discipline with measurable quality, and it has a workflow:

1. **Know the technique.** You have run it; you know the implementation you are facing. A
   detection written against a vendor's description is a guess.
2. **Find your telemetry.** Which events does this technique produce on *your* platform, with
   *your* configuration? If the answer is "none", that is a finding — stop and escalate it,
   because no rule can compensate for missing data.
3. **Write the rule with an anchor and narrowing conditions.** A broad condition you cannot
   miss, plus specific conditions that remove the crowds. Every narrowing condition is a
   trade-off.
4. **Test it against benign activity.** A rule that has never been tested has a false-positive
   rate you do not know.
5. **Record the trade-off.** Write down what a determined attacker could now do to slip past
   the refined rule. This note is the honest part of the deliverable, and it is what
   distinguishes engineering from theatre.

The framework vocabulary matters here. **ATT&CK coverage** — the claim that you detect each
technique — is easy to overstate. A rule can exist and never fire, fire and never be
triaged, or be triaged so noisy that analysts have learned to ignore it. Real coverage is
measured by executing the technique and observing whether an alert fires *and* whether a
human acts. That is why the next modules include a purple-team exercise and log analysis.

Logging itself is also a control, and its failure is a recognized weakness class (OWASP A09,
logging and monitoring failures). If an authorization failure, a persistence write, or a
credential dump produces no record, then every later phase of incident response is
guesswork.

## Key concepts

**Collection is not detection.** Data in a SIEM is not a decision. Detection is judgement
with a measured error rate.

**Anchor plus narrowing.** The standard shape of a survivable rule, and every narrowing step
is a documented trade-off.

**Alert volume is a security property.** A rule that floods trains analysts to ignore the
real event alongside the noise.

**Coverage is a claim; testing is the evidence.** Execute, observe, and record whether a
human acted.

## Further reading

- MITRE ATT&CK's detection notes on the technique pages used above, and MITRE D3FEND for
  countermeasure vocabulary.
- NIST SP 800-61 for incident-handling process, and SP 800-92 for log management.
- OWASP A09: logging and monitoring failures.
