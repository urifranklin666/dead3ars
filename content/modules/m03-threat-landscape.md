---
id: m03-threat-landscape
order: 3
title: "The Modern Threat Landscape"
tier: foundation
minutes: 75
summary: >-
  Before learning how attacks work, learn which ones actually happen. This module maps the
  current threat picture: identity and access abuse, ransomware economics, supply-chain
  compromise, exploitation of edge devices, and the emerging AI attack surface.
objectives:
  - Map real threat categories to MITRE ATT&CK tactics and techniques using their exact IDs.
  - Explain why initial access is dominated by identity attacks rather than novel exploits.
  - Describe the modern ransomware business model including initial-access brokers.
  - Explain how supply-chain compromise lets one victim compromise many.
  - Identify the new attack surface introduced by LLM and agentic AI systems.
mitre: ["T1078", "T1566", "T1190", "T1195", "T1486", "T1059", "T1055", "T1071", "T1041"]
cwe: ["CWE-287", "CWE-798", "CWE-89", "CWE-79"]
csf: ["ID.RA-01", "ID.RA-05", "DE.AE-02"]
owasp: ["A01:2025", "A03:2025", "A07:2025"]
attackTechniques:
  - "Valid Accounts (T1078)"
  - "Phishing (T1566)"
  - "Exploit Public-Facing Application (T1190)"
  - "Supply Chain Compromise (T1195)"
  - "Data Encrypted for Impact (T1486)"
  - "Command and Scripting Interpreter (T1059)"
defenses:
  - Phishing-resistant MFA and least-privilege accounts, because most initial access is abuse of legitimate credentials
  - Offline, tested backups with a rehearsed restore, the only reliable answer to data encrypted for impact
  - Vendor and update-path risk assessment, so a supplier's compromise does not become yours
  - Aggressive patching and hardening of internet-facing services, which are attacked without any user action
lab:
  name: "Threat model your own scenario"
  environment: read-only
  brief: >-
    Choose a system you know well - a small business, a school, a hospital, or a home
    network - and build a written threat model for it. You will name assets, map likely
    attack paths to ATT&CK technique IDs, and propose controls. No systems are touched.
  steps:
    - do: "Name the organization you are modelling and list its five most valuable assets."
      expect: "Assets you can rank; if everything is most valuable, you have not prioritised."
    - do: "For each asset, name the most likely way an attacker reaches it, and tag that path with the ATT&CK technique ID or the CWE weakness."
      expect: "Every path carries an ID, e.g. T1078 for stolen credentials, CWE-89 for an injection flaw."
    - do: "Rank the three most likely paths by expected harm, not by novelty."
      expect: "Identity-based paths usually outrank exotic exploits. If your list is all zero-days, revisit it."
    - do: "For each of the top three, name one control that raises the cost of that path, and state which ATT&CK tactic it interferes with."
      expect: "Controls mapped to a tactic, e.g. phishing-resistant MFA against Initial Access (TA0001)."
    - do: "Write one paragraph on what you would do first if you had a single day and a small budget."
      expect: "A defensible answer that a non-technical manager could fund."
  success:
    - Five ranked assets with a documented rationale
    - An attack path for each asset, every one carrying a technique or weakness ID
    - Three prioritised paths with a mapped control each
    - A one-day, small-budget recommendation
  cleanup:
    - "Nothing was touched. Keep your threat model; it becomes the basis of the capstone in the final module."
ethics:
  boundary: >-
    Threat modelling is analysis, not attack. You are reasoning about a system from the
    outside using public knowledge and your own judgement. This lab never requires you to
    probe, scan, or contact any real organisation - and you must not, even to 'check'
    whether your model is right.
  legal: >-
    Reading public threat intelligence and vendor reports is entirely lawful and is how
    professionals keep current. Scanning or probing an organisation you do not own or have
    written authorization to test is a criminal offence under laws such as the CFAA and the
    UK Computer Misuse Act, regardless of how harmless the probe feels.
  disclosure: >-
    If your threat model produces a specific, actionable finding about a real organisation -
    for instance, that a named public service appears exposed - do not test it yourself.
    Report it privately to that organisation, or to a national CERT, and let them verify it.
assessment:
  - q: "Which ATT&CK technique ID represents an adversary logging in with stolen but legitimate credentials?"
    options:
      - "T1566 Phishing"
      - "T1078 Valid Accounts"
      - "T1059 Command and Scripting Interpreter"
      - "T1195 Supply Chain Compromise"
    answer: 1
    explain: >-
      T1078 Valid Accounts covers use of legitimate credentials, including default,
      purchased, or stolen ones. It is one of the most common techniques in real intrusions
      precisely because it generates far less anomalous activity than exploiting a
      vulnerability, and why phishing-resistant authentication and credential hygiene matter
      so much.
  - q: "Why do identity attacks such as T1566 (Phishing) and T1078 (Valid Accounts) dominate initial access in modern reporting, rather than novel software exploits?"
    options:
      - "Because exploits never work any more."
      - "Because a valid credential produces plausible-looking activity, needs no memory-corruption exploit for the current patch level, and scales cheaply across many targets."
      - "Because defenders have stopped patching."
      - "Because attackers are less skilled than they used to be."
    answer: 1
    explain: >-
      Attackers optimise for reliability and cost. Credentials are reusable, they look like
      normal behaviour, and they do not depend on the victim missing a specific patch. That
      economics is why MFA, credential hygiene, and behavioural detection have become the
      centre of defensive effort.
  - q: "A software vendor is compromised and a malicious update is pushed to its customers. Which ATT&CK technique is this?"
    options:
      - "T1486 Data Encrypted for Impact"
      - "T1195 Supply Chain Compromise"
      - "T1041 Exfiltration Over C2 Channel"
      - "T1071 Application Layer Protocol"
    answer: 1
    explain: >-
      T1195 covers manipulation of products or delivery mechanisms before the victim
      receives them. Its power is leverage: one compromise becomes hundreds, because the
      victims trusted the vendor's update channel. It is why software supply-chain integrity
      (signed builds, reproducible artifacts, dependency review) is now a core defensive
      concern.
  - q: "Which of these is genuinely a NEW attack surface created by agentic AI systems, rather than a renamed version of an old one?"
    options:
      - "SQL injection in a web form."
      - "A malicious instruction hidden in content the agent reads, which causes the agent to misuse a tool it has legitimately been granted."
      - "Phishing email arriving in an inbox."
      - "A weak password on an administrative account."
    answer: 1
    explain: >-
      This is prompt injection in a tool-using agent, and it is qualitatively new: the agent
      holds real permissions, so untrusted content it merely reads can become an action it
      takes. The defence is architectural - least-privilege tools, explicit confirmation for
      consequential actions, and treating all fetched content as untrusted input.
  - q: "In the OWASP Top 10, which category covers weaknesses in confirming a user's identity and in session handling, such as CWE-287?"
    options:
      - "A01 Broken Access Control"
      - "A05 Injection"
      - "A07 Authentication Failures"
      - "A09 Security Logging and Alerting Failures"
    answer: 2
    explain: >-
      A07 Authentication Failures covers weaknesses in confirming a user's identity and in
      session handling. It pairs naturally with ATT&CK T1078: the attacker uses valid accounts
      because the authentication was weak enough to obtain them. The 2025 edition renamed this
      category from "Identification and Authentication Failures" and renumbered the list, so
      quote the edition you used in your report rather than the number alone.
---

Everything you learn from here is a *technique*. This module is about *prevalence* — which
techniques actually show up in real incidents, and therefore where the value is for both
an attacker and a defender.

## Scenario

You have been asked by a small regional hospital to advise on where to spend a limited
security budget. You cannot see inside their network. You have only public reporting on
what is currently happening to organizations like theirs. Your job is to turn that public
information into a defensible recommendation.

## Attacker's view

Attackers are economic actors. They choose the technique with the best return: the one
that is cheapest, most reliable, and least likely to be detected. That calculation explains
most of the modern landscape.

- **Identity is the cheapest door (T1078).** Credentials can be phished (T1566), bought from
  an initial-access broker, or found in a repository. Using them generates traffic that
  looks like normal work, so it survives shallow detection. No exploit is needed, and it
  does not depend on the victim missing a particular patch.
- **Edge and public-facing services are the favourite exploit target (T1190).** Remote
  access gateways, VPN concentrators, and file-transfer appliances sit on the internet by
  necessity, so they are reachable without any user action. A flaw in one is worth far more
  than a flaw in a desktop.
- **Supply chain gives leverage (T1195).** Compromising a vendor lets one intrusion cascade
  into hundreds of victims who trusted the update channel. This pattern is why so much
  defensive attention now goes to build integrity.
- **Ransomware is a business model (T1486).** Encryption for impact is the collection step
  of a ransomware-as-a-service economy, often with initial-access brokers (T1078, T1566)
  selling footholds to affiliates who then move laterally, escalate, and exfiltrate before
  encrypting.
- **Living off the land (T1059).** Using the system's own scripting and administration tools
  reduces the number of foreign binaries and blends in with legitimate administration.

## Defender's view

Prevalence tells a defender where effort pays. If most intrusions begin with valid
credentials, then phishing-resistant authentication, credential hygiene, and detection of
anomalous authentication are where the return is — not on the exotic vulnerability that
will never be exploited against you. The same reporting that shows attackers favouring
identity flows also shows that the organizations most resilient to ransomware had
segmented networks, tested restores, and rehearsed response, not merely a full patching
programme.

Two structural lessons recur:

- **Detect the consequence, not the keystroke.** You cannot reliably distinguish legitimate
  admin tooling from malicious use by the command alone; you can detect the unusual
  sequence, the odd parent process, or the unusual destination.
- **Reduce blast radius.** Segmentation and least privilege convert a successful initial
  access into a contained incident rather than a company-ending one.

## The emerging AI surface

Agentic LLM systems add a genuinely new attack surface, and this course will revisit it
in a later module. The core issue is *authority*: an agent reads untrusted content and holds
real permissions, so an instruction hidden in that content can become an action the agent
takes on the attacker's behalf. This is not a renamed classic vulnerability; the trust
boundary has moved. Defences are architectural — least-privilege tools, human confirmation
for consequential steps, and treating all ingested content as untrusted.

## Key concepts

**Tactic vs technique.** A tactic (TA####) is the *goal* — Initial Access, Persistence,
Exfiltration. A technique (T####) is *how* it is done. Threat models are usually organised
by tactic and populated with techniques.

**Prevalence beats novelty.** A defender should weight by likelihood and impact, not by how
interesting the vulnerability is.

**The economics shape the tradecraft.** Identity attacks dominate because they are cheap
and quiet; supply-chain attacks happen because they give leverage. Understanding the
motivation predicts the method.

## Further reading

- MITRE ATT&CK (attack.mitre.org) — the technique IDs used above, with procedure examples.
- OWASP Top 10:2025 and the OWASP Top 10 for LLM Applications 2025 — the current editions, and
  the numbering this module uses.
- CISA's Known Exploited Vulnerabilities catalog, and ENISA's and Verizon's annual threat
  reports, for the year-over-year picture.
