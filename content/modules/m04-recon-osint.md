---
id: m04-recon-osint
order: 4
title: "Reconnaissance and OSINT"
tier: core
minutes: 90
summary: >-
  The first phase of every engagement and every intrusion: work out what is out there. You
  will use passive collection against your own lab and your own public footprint, then
  actively enumerate the lab hosts you own, and learn why passive is usually the better
  starting point.
objectives:
  - Collect passive information without sending traffic to the target.
  - Enumerate hosts and services on a network you own using active discovery.
  - Map what you found to ATT&CK Reconnaissance and Discovery techniques.
  - Identify your own public exposure and reduce it.
mitre: ["T1595", "T1592", "T1589", "T1590", "T1046", "T1087", "T1018", "T1082"]
cwe: []
csf: ["ID.AM-01", "ID.AM-02", "ID.RA-01"]
owasp: []
attackTechniques:
  - "Active Scanning (T1595)"
  - "Gather Victim Host Information (T1592)"
  - "Gather Victim Identity Information (T1589)"
  - "Network Service Discovery (T1046)"
  - "Account Discovery (T1087)"
  - "System Information Discovery (T1082)"
defenses:
  - Certificate naming and DNS hygiene, so public logs do not disclose internal project names
  - Removal of stale DNS records for decommissioned services, a classic forgotten door
  - Logging and alerting on scans of internet-facing ranges, so probing becomes a visible event
  - Credential rotation wherever public breach data shows an exposure
lab:
  name: "Map your own range, then map yourself"
  environment: sandbox
  brief: >-
    Two halves. First, actively enumerate your isolated lab VM: find live hosts, open
    ports, and running services. Second, do passive-only collection on your own public
    footprint. The contrast between the two is the lesson.
  steps:
    - do: "Bring up two lab VMs on your host-only network and note their addresses."
      expect: "Two hosts with addresses you recorded before scanning, not discovered by scanning."
    - do: "Run a host-discovery sweep of your lab subnet and compare the result to the addresses you expected."
      expect: "The sweep finds your known hosts and nothing unexpected. Any surprise is a finding about your own lab."
    - do: "Scan one lab VM for open ports, then identify the service behind each open port."
      expect: "A port list, and for each port a guess at the service and its version."
    - do: "From a machine that is NOT in the lab, attempt the same scan against one of your lab hosts."
      expect: "It fails - your isolation holds. Record the failure as evidence your lab is correct."
    - do: "Passively collect what is publicly knowable about your own name and domain: certificate transparency logs, DNS records, and public breach-notification services. Do not send scan traffic to anything you do not own."
      expect: "A list of what an outsider could learn without touching your systems."
    - do: "For each item on that passive list, write whether it is intended to be public, and one change that would reduce the unintended ones."
      expect: "At least one concrete reduction, such as DNS hygiene or certificate naming."
  success:
    - An inventory of your lab hosts and their services, produced by your own enumeration
    - Proof that a machine outside the lab cannot reach inside it
    - A passive exposure list of your own footprint with at least one remediation
  cleanup:
    - "No changes to external systems were made. Power off the lab VMs when finished; keep snapshots for the next module."
ethics:
  boundary: >-
    The rule for this module is simple and absolute: active scanning and enumeration happen
    ONLY on the lab network you own. The public half of the lab is strictly passive -
    certificate transparency, published DNS, and breach-notification services that already
    hold the data. Do not port-scan, banner-grab, or probe any host you do not own, however
    small the range looks.
  legal: >-
    Port scanning a system without authorization is unauthorized access in several
    jurisdictions, and even where it is a grey area it routinely breaches provider terms of
    service and acceptable-use policies. In the United States, scanning can support a CFAA
    charge; the UK Computer Misuse Act similarly covers unauthorised access, which includes
    attempts. Passive collection of already-published records is a different act with a
    different legal character, which is exactly why professionals prefer it first.
  disclosure: >-
    If passive collection turns up real exposure of your own - an old subdomain pointing at
    a decommissioned service, credentials in a public paste - fix it, change the credential,
    and keep a note. If it concerns a third party, report privately to them; do not verify it
    by probing.
assessment:
  - q: "Which ATT&CK technique ID covers active network scanning of a target?"
    options:
      - "T1046 Network Service Discovery"
      - "T1595 Active Scanning"
      - "T1589 Gather Victim Identity Information"
      - "T1018 Remote System Discovery"
    answer: 1
    explain: >-
      T1595 is the Reconnaissance-phase technique for actively probing infrastructure, and it
      sits outside the victim's visibility in the sense that it happens before any foothold.
      T1046 is the related Discovery-phase technique used from *inside* a network once an
      adversary already has a position. The distinction matters when you write up findings:
      did the activity happen before or after access?
  - q: "Why do professionals prefer passive collection to active scanning in the first stage of an engagement?"
    options:
      - "Because it is more accurate."
      - "Because it generates no traffic to the target, so it cannot be mistaken for an attack, cannot breach acceptable-use terms, and tells the client nothing they did not already publish."
      - "Because active scanning never works through firewalls."
      - "Because passive tools are cheaper."
    answer: 1
    explain: >-
      Passive collection uses records that already exist - certificate transparency, DNS,
      published breach data. It carries far less legal and operational risk. Active scanning
      is sometimes necessary, but it should be a deliberate, authorized step, not the
      default opening move.
  - q: "You are scanning your own lab subnet and discover a host you did not create. What is the correct response?"
    options:
      - "Scan it more thoroughly to identify it."
      - "Stop scanning, note the address and time, and investigate your own lab configuration before anything else."
      - "Assume it is a mistake and ignore it."
      - "Immediately report it to your ISP."
    answer: 1
    explain: >-
      An unexpected host on a network you believe is isolated means your isolation is wrong -
      you may be on the real LAN, which makes every scan you have run unauthorized. Stop,
      investigate the configuration, and only resume once you can explain the host. On the
      real internet this same surprise is the moment a tester must stop and make a phone call.
  - q: "Certificate transparency logs reveal a hostname you believed was internal-only. What is the defensive significance?"
    options:
      - "None - CT logs are a curiosity."
      - "It is published information about your infrastructure, so it is exactly what a passive adversary collects first; it can disclose internal naming, project names, and forgotten services."
      - "It means your certificates are invalid."
      - "It proves you have been breached."
    answer: 1
    explain: >-
      CT logs are public by design and every certificate issued for a public name appears in
      them. They commonly leak internal project names and reveal subdomains that were meant to
      stay quiet. Treating them as reconnaissance input, and naming certificates accordingly, is
      basic infrastructure hygiene.
  - q: "Which of these is Discovery-phase (post-compromise) rather than Reconnaissance-phase?"
    options:
      - "T1592 Gather Victim Host Information"
      - "T1590 Gather Victim Network Information"
      - "T1087 Account Discovery"
      - "T1595 Active Scanning"
    answer: 2
    explain: >-
      T1087 Account Discovery is performed after access is obtained, to enumerate users and
      groups from inside. The T159x family is Reconnaissance, performed before access. Keeping
      the two apart in a report tells the reader whether you are describing what happens before
      or after the perimeter is crossed.
---

Reconnaissance is where every engagement begins and where attackers spend a surprising
amount of time. It is also the phase with the most legal sensitivity, because it is the
point at which you may be touching systems you do not own.

## Scenario

You have been hired to assess a small company. Before any testing begins, you want to know
everything an outsider could learn without touching them: what domains and hosts exist,
what services are exposed, what technology they appear to run, and what has leaked into
public records. Then you will contrast that with what active enumeration reveals, using your
own lab as the target.

## Attacker's view

Reconnaissance divides into two modes, and choosing between them is the first tradecraft
decision of an engagement.

**Passive (T1590, T1592, T1589).** Consult records that already exist and that the target
cannot observe you reading: certificate transparency logs, published DNS records, WHOIS,
public code repositories, breach-notification services, and job postings that reveal the
technology stack. No packet ever reaches the target. The target cannot see you, cannot log
you, and cannot accuse you of anything.

**Active (T1595).** Send traffic: resolve names, discover live hosts, probe ports, grab
banners. This is faster and more accurate, and it is visible. The target's logs and their
IDS may record it, which is a problem both for a real intrusion and, critically, for the
legality of an engagement.

An attacker with patience works passively first, and treats active scanning as a
deliberate, late, targeted step. The professional does the same, for additional reasons:
it is quieter, it breaches fewer terms of service, and it gives the client an accurate
picture of what their own public footprint already leaks.

## Defender's view

If you want to know how exposed you are, do this exercise on yourself. The defender's goal
is to shrink the passive footprint, because passive data is data an attacker gets for free
and you never learn about.

Concretely: audit your certificate naming so it does not disclose internal project names;
remove stale DNS records for decommissioned services, which are a classic forgotten door;
check whether credentials or internal hostnames have appeared in public breach dumps and
rotate anything that has. And accept that active scanning *will* happen eventually — make
sure it is logged and alerted, so a scan is a detectable event rather than an unnoticed one.
That is the bridge to the detection modules later in the course.

## Key concepts

**Reconnaissance vs Discovery.** The T159x techniques happen *before* access is obtained.
The Discovery techniques (T1046 network service discovery, T1087 account discovery, T1018
remote system discovery, T1082 system information discovery) happen *after* a foothold,
from inside. Reporting is clearer when you keep the phases separate.

**You cannot defend what you cannot see.** Passive exposure is invisible to you by default.
Enumerating your own footprint is the only way to know it.

**Isolation is verifiable.** The lab step where a machine outside the lab fails to reach a
machine inside it is not busywork — it is the evidence that everything else you do is
contained.

## Further reading

- MITRE ATT&CK Reconnaissance (TA0043) and Discovery (TA0007) tactic pages.
- Certificate Transparency log search services, for checking your own public names.
- NIST SP 800-115 for the pre-engagement and information-gathering phases.
