---
id: m08-privesc-persistence
order: 8
title: "Privilege Escalation, Persistence, and Lateral Movement"
tier: advanced
minutes: 120
summary: >-
  You are in. Now what? This module covers the mechanics of turning a foothold into control:
  raising privilege, surviving a reboot, and moving to another host. Every technique is
  practised on your own lab VM, and every one is paired with the control that stops it.
objectives:
  - Explain the difference between a misconfiguration, a missing patch, and a design weakness.
  - Identify privilege-escalation opportunities on a misconfigured lab host and exploit one.
  - Establish a persistence mechanism and locate it afterwards as a defender would.
  - Describe lateral movement technique classes and the segmentation that limits them.
mitre: ["T1548", "T1068", "T1574", "T1547", "T1053", "T1021", "T1569", "T1570", "T1003"]
cwe: ["CWE-269", "CWE-250", "CWE-732"]
csf: ["PR.AA-05", "PR.IR-01", "DE.CM-03"]
owasp: []
attackTechniques:
  - "Abuse Elevation Control Mechanism (T1548)"
  - "Exploitation for Privilege Escalation (T1068)"
  - "Hijack Execution Flow (T1574)"
  - "Boot or Logon Autostart Execution (T1547)"
  - "Scheduled Task/Job (T1053)"
  - "Remote Services (T1021)"
  - "OS Credential Dumping (T1003)"
defenses:
  - Configuration baselines that catch unquoted service paths, writable service directories, and weak service permissions
  - Enumerating and alerting on the whole logon-autostart set, not just registry Run keys
  - Network segmentation and least privilege, so a compromised host has no reachable neighbour by default
  - Restricting where privileged credentials may be used, and treating any credential dump as a critical incident
lab:
  name: "Escalate, persist, and then hunt yourself"
  environment: sandbox
  brief: >-
    On a purpose-built lab VM with deliberately weak permissions, you will find an escalation
    path, establish persistence, then switch to the defender's role and enumerate the
    persistence you created from a cold start, using only what a defender could see.
  steps:
    - do: "Take a snapshot of the lab VM before you begin, and confirm you can restore it."
      expect: "A restore you have actually performed, not merely a snapshot you took."
    - do: "Enumerate the host for escalation opportunities: weak service permissions, unquoted service paths, or a writable directory on the executable search path."
      expect: "A list of candidate weaknesses, each with the reason it is a candidate."
    - do: "Exploit one candidate to gain elevated rights. Record the exact commands and the evidence of the new privilege level."
      expect: "Proof of elevation, and a note of which single misconfiguration enabled it."
    - do: "Establish persistence using a logon autostart mechanism. Note where it lives and what would survive a reboot."
      expect: "A persistence mechanism you can describe precisely, with its reboot survival noted."
    - do: "Now switch roles. Without using your own notes, enumerate the host cold and find the persistence you planted."
      expect: "You locate it using only standard host review - this is how a defender finds it."
    - do: "Reboot. Confirm the persistence took effect, then remove it and confirm it is gone."
      expect: "The full lifecycle observed: planted, survivable, found, removed."
  success:
    - A snapshot restored before the exercise began
    - One privilege-escalation path exploited, with the enabling misconfiguration named
    - Persistence planted, discovered from a cold start, and removed with confirmation
  cleanup:
    - "Remove every persistence mechanism you created, or restore the snapshot. Verify the removal."
    - "The lab VM is the only machine touched."
ethics:
  boundary: >-
    Privilege escalation and persistence are the techniques that turn a contained incident
    into a breach, and they are also the ones with the widest legal blast radius if misused.
    Everything here is done inside a lab VM that exists specifically to be broken. You may
    also escalate on a machine you own outright. You may never do it on a shared machine,
    an employer's device, or a client's system outside a written engagement.
  legal: >-
    Attempting to raise privilege on a system you are not authorised to modify is not a
    marginal act: it is the core of what computer-misuse statutes criminalise, and persistence
    is an aggravating factor because it is concealment. In many jurisdictions attempting,
    even without success, is sufficient. The CFAA, the UK Computer Misuse Act, and EU
    Directive 2013/40/EU all cover it. On a shared system you may also breach acceptable-use
    policy, employment terms, and any number of contracts.
  disclosure: >-
    If you discover an escalation path on a real system that you are authorised to work on,
    report it with the minimum evidence needed to reproduce it, and do not leave any
    persistence behind - a forgotten backdoor is a breach you caused and will be blamed for.
  notes: >-
    Persistence is the technique most likely to survive an engagement. Maintain a
    written inventory of every mechanism you create so that the cleanup step is verifiable
    rather than hopeful.
assessment:
  - q: "A service's executable path contains a space and is unquoted. Why can this be a privilege-escalation vector?"
    options:
      - "It makes the service run slowly."
      - "Windows may try to resolve the path through several candidate executables, so a file placed earlier in the search order can be executed with the service's privileges."
      - "It prevents the service from restarting."
      - "It exposes the service to the network."
    answer: 1
    explain: >-
      The operating system interprets the ambiguous path by trying candidate names. If an
      attacker can write to one of those locations, their file runs in place of the intended one,
      with the service account's rights - often SYSTEM. It is a misconfiguration (CWE-428
      unquoted search path) rather than a missing patch, which is why configuration baselines
      catch it where patch management does not.
  - q: "Which distinction best separates a misconfiguration, a missing patch, and a design weakness?"
    options:
      - "There is no meaningful distinction."
      - "A missing patch is a known flaw that a vendor fix addresses; a misconfiguration is a setting or permission that was always wrong; a design weakness has no single patch because the architecture itself permits the abuse."
      - "A misconfiguration requires administrator access to fix."
      - "A design weakness only exists in web applications."
    answer: 1
    explain: >-
      The categories matter because the remedies differ. Patching is a maintenance process;
      configuration management and baselines address misconfigurations; design weaknesses need
      architectural change, such as moving an authorization check server-side. Treating a design
      weakness as a patchable bug produces patches that do not close the hole.
  - q: "Which technique ID covers a scheduled task used as a persistence mechanism?"
    options:
      - "T1547 Boot or Logon Autostart Execution"
      - "T1053 Scheduled Task/Job"
      - "T1021 Remote Services"
      - "T1078 Valid Accounts"
    answer: 1
    explain: >-
      T1053 is the scheduled task or job technique and is frequently persistence as well as
      execution. T1547 covers other autostart mechanisms such as registry Run keys, startup
      folders, and services. A thorough defender enumerates the whole autostart set, because a
      tester or an attacker will use whichever is least monitored.
  - q: "What is the most reliable structural control against lateral movement between workstations?"
    options:
      - "Stronger endpoint antivirus."
      - "Network segmentation and least privilege, so a compromised host has no path and no credential that reaches anything else by default."
      - "Longer passwords."
      - "Disabling print spooler services."
    answer: 1
    explain: >-
      Technique classes for movement - remote services (T1021), service execution (T1569), lateral
      tool transfer (T1570) - all depend on reachability and standing credentials. Segmentation
      and least privilege remove the conditions they need, rather than trying to recognise each
      implementation. This is also why identity hygiene (T1003 credential dumping countermeasures)
      is inseparable from segmentation.
  - q: "You are authorised to test a client's network and you establish persistence. What does professional practice require?"
    options:
      - "Leave it in place so the client can find it themselves."
      - "Record every mechanism created, tell the client where each one is, and remove them all before the engagement ends, verifying removal."
      - "Leave one backdoor for a future engagement."
      - "Encrypt the mechanism so only you can use it."
    answer: 1
    explain: >-
      An unremoved persistence mechanism is a real vulnerability you introduced, and it may
      outlive the engagement and the staff who knew about it. Maintaining an inventory and
      verifying removal is part of the deliverable, and leaving a backdoor deliberately is a
      criminal act regardless of the authorisation that preceded it.
---

This is the module where a single foothold becomes control of an environment. It is also
the module with the widest gap between lawful practice and a criminal act, because
privilege escalation and persistence affect a system's security state directly.

## Scenario

Your lab VM represents a workstation in a small company's network. It has been configured,
deliberately, with the kinds of weaknesses that accumulate in real environments: a service
with loose permissions, an over-privileged account, a writable directory where it should
not be. Your task is to go from a normal user to control of the machine — and then to find
your own footprints the way a defender would.

## Attacker's view

**Privilege escalation (T1548, T1068, T1574).** Escalation rarely requires a novel exploit.
It usually requires noticing that the environment is configured generously: a service
running as a powerful account that reads a file from a writable directory; a service path
that is unquoted so the OS resolves it ambiguously; a scheduled task whose script a lower-
privileged user can edit. The three categories matter because their remedies differ — a
missing patch is fixed by patching, a misconfiguration by configuration management, and a
design weakness by architecture.

The tradecraft is enumeration discipline. Check permissions methodically against a known
list, rather than trying the first idea that comes to mind. Automating the boring part and
reasoning about the results is the skill.

**Persistence (T1547, T1053).** A foothold that dies with the process is worthless. The
attacker's options are the same autostart set a defender should be enumerating: registry run
keys, startup folders, services, scheduled tasks, and shell profiles. Choosing among them is
a detection-avoidance decision — use the mechanism that is least monitored, not the most
convenient.

**Lateral movement (T1021, T1569, T1570, T1003).** Movement depends on two things:
reachability and credentials. Obtain either and you can expand. This is why credential
access (T1003) is such a pivot point: credentials convert one compromised host into a
directory of reachable ones.

## Defender's view

Each escalation and movement class has a structural counter, and the counters are dull,
which is why they are neglected.

- **Configuration baselines.** Unquoted paths, writable service directories, and weak service
  permissions are configuration defects. A baseline check finds them all at once, where a
  vulnerability scanner looks only for CVEs.
- **Enumerate and alert on the whole autostart set.** An attacker picks the least-monitored
  mechanism. If you monitor only Run keys, you will miss scheduled tasks.
- **Segmentation and least privilege.** Movement requires reachability and standing rights.
  Remove both by default, and an attacker who owns one workstation owns one workstation.
- **Credential hygiene.** Protect credential stores, restrict where privileged credentials may
  be used, and treat any credential dump as a critical incident, because it converts one
  foothold into many.

## Key concepts

**Escalation is usually configuration, not exploitation.** The environment was generous, not
the code flawed.

**Persistence is a choice among mechanisms, made for evasion.** Therefore the defender must
watch the whole set.

**Movement requires reach plus credentials.** Deny either and the incident stays contained.

**Persistence you plant is a vulnerability you introduce.** Inventory it, and verify removal.

## Further reading

- MITRE ATT&CK Privilege Escalation (TA0004), Persistence (TA0003), and Lateral Movement
  (TA0008) tactic pages.
- CIS Benchmarks for the platform you are labbing, for the configuration baseline.
- CWE-269 (improper privilege management), CWE-250 (execution with unnecessary privileges),
  CWE-732 (incorrect permission assignment).
