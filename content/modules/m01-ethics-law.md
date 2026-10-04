---
id: m01-ethics-law
order: 1
title: "Ethics, Law, and Authorization"
tier: foundation
minutes: 45
summary: >-
  Everything in this course is legal, or it is a felony. This module establishes the
  line between the two, who is allowed to authorize testing, and how professionals
  keep themselves and their employers out of prison.
objectives:
  - Distinguish an authorized penetration test from unauthorized access in law and in practice.
  - State who can lawfully authorize testing of a system, and why a verbal "go ahead" is not enough.
  - Describe the function of a scope document, rules of engagement, and a get-out-of-jail letter.
  - Explain responsible vulnerability disclosure and the norms a professional follows.
mitre: []
cwe: []
csf: ["GV.OC-01", "GV.RR-01", "GV.RR-02"]
owasp: []
attackTechniques: []
defenses:
  - Written authorization naming the exact systems, dates, and test types permitted
  - Documented rules of engagement with a stop condition and an emergency contact
  - Scope boundaries maintained by the tester, not assumed from the client's description
lab:
  name: "Authorization pack review and scenario triage"
  environment: read-only
  brief: >-
    You will read a deliberately ambiguous authorization email, decide whether each of
    six scenarios is lawful, and write the scope language that would have made the
    ambiguous ones safe. Nothing is attacked here; you are learning to read permission.
  steps:
    - do: "Read the two sample authorization emails in this module's notes (one valid, one not)."
      expect: "You can name the four elements the valid one has and the invalid one lacks."
    - do: "For each of the six short scenarios, write 'lawful' or 'unlawful' and the single fact that decides it."
      expect: "A one-line justification for each that points at authorization, not intent."
    - do: "Take the ambiguous email and rewrite it as a proper scope document: systems in scope, systems explicitly excluded, window, test types, emergency contact."
      expect: "Someone reading only your document could test without asking a further question."
    - do: "Write down the stop condition you would want if the test started affecting a production service."
      expect: "A concrete, observable trigger and a person to call."
  success:
    - Six scenarios decided with the deciding fact named for each
    - A rewritten scope document that removes every ambiguity you found
    - A written stop condition with a named contact
  cleanup:
    - "Nothing to clean up; this module makes no changes to any system."
ethics:
  boundary: >-
    This module exists because technique without authorization is a crime. You may read
    about, and later practise, attacks only inside the labs defined by this course, or
    against systems you own outright. Reading a public exploit is lawful in most
    jurisdictions; running it against a machine you do not own is not.
  legal: >-
    In the United States unauthorized access is charged under the Computer Fraud and
    Abuse Act (18 U.S.C. 1030); the UK equivalent is the Computer Misuse Act 1990, and
    the EU has the Directive on Attacks against Information Systems (2013/40/EU). These
    are criminal statutes, not civil policy. Penalties commonly include imprisonment.
    Authorization must come from the system's owner or an officer of the organization
    that operates it, in writing, before any test begins.
  disclosure: >-
    If you find a real vulnerability outside an engagement, you have a reporting path,
    not an invitation. Report privately to the vendor or to a national CERT; do not
    exploit it, do not sell it, and do not test past the point where you confirmed it
    was there.
assessment:
  - q: "A client emails: 'sure, go ahead and test us whenever.' What is the decisive problem with relying on this as authorization?"
    options:
      - "It was sent by email rather than signed."
      - "It does not identify which systems, during which window, or what test types are permitted, and it may not come from someone empowered to authorize."
      - "It is not on company letterhead."
      - "Nothing - an email is legally binding once sent."
    answer: 1
    explain: >-
      The defect is scope and authority, not the medium. Valid authorization names the
      systems, the window, the permitted techniques, and comes from someone with the
      authority to grant it. 'Whenever' is unbounded in time and target, and a random
      employee cannot authorize an intrusion into their employer's systems.
  - q: "During an authorized test you discover a second, unrelated company's data exposed on the same server. What do you do?"
    options:
      - "Test that server too, since you already have access."
      - "Ignore it entirely and say nothing."
      - "Stop touching that data, document what you saw minimally, and report it to your client contact."
      - "Download a copy so you can prove it existed."
    answer: 2
    explain: >-
      Your authorization covers the client's systems, not their neighbour's. Accessing
      further would be unauthorized access even mid-engagement. Document the fact of
      exposure without collecting the data, and let the client handle notification -
      they may have legal duties to the other party.
  - q: "Which best describes the 'get out of jail' element of an engagement?"
    options:
      - "A legal guarantee that no charge can ever be brought."
      - "A written authorization from the system owner that a court or prosecutor can read, and which your emergency contact can produce."
      - "A contract clause that makes the tester's employer liable."
      - "An informal nod from the IT manager."
    answer: 1
    explain: >-
      It cannot prevent a charge, but it is the evidence that consent existed. Testers
      carry it and can produce it immediately, because the first official you meet
      mid-test is likely to be a police officer or a member of the client's own
      security team who has not been told about the test.
  - q: "A researcher finds a serious flaw in widely used software. What does responsible disclosure require?"
    options:
      - "Posting full details publicly immediately, so users can protect themselves."
      - "Selling it to the highest bidder, since that funds more research."
      - "Reporting it privately to the vendor or a CERT, allowing a reasonable fix window before public detail, and not testing beyond confirming the flaw."
      - "Keeping it secret permanently so nobody can abuse it."
    answer: 2
    explain: >-
      Private report, reasonable remediation window, then coordinated publication is the
      norm. Immediate public disclosure endangers unpatched users; permanent secrecy means
      it never gets fixed and it does not protect anyone. Selling weaponizes it against
      the public you claim to defend.
---

This is the module that determines whether the rest of the course makes you a security
professional or a defendant. Read it carefully; the labs later assume you understand it.

## Scenario

You have been hired by a fictional medical clinic, **Northside Family Practice**, to
assess the security of its patient portal. You have an email thread, a phone number,
and a nervous IT contractor who keeps saying "just don't break anything, okay?"

Before you touch anything, you must be able to answer four questions in writing:

1. **Who** authorized this, and do they have the authority to authorize it?
2. **What** systems are in scope — and, just as important, what is explicitly out?
3. **When** may you test, and when must you stop?
4. **What** are you permitted to *do*, and what is off limits regardless of scope?

## Attacker's view

An attacker's central advantage is that they choose the target and owe no one an
explanation. They do not need authorization, a scope document, or a report. That freedom
is also their constraint: an attacker cannot ask the client's engineers which endpoint is
fragile, cannot read the architecture documentation, and cannot walk into the building.

A professional tester has authorization, access, and a relationship — three enormous
advantages that an attacker lacks. The paperwork is not a bureaucratic obstacle bolted
onto the fun part. It is the instrument that converts unauthorized intrusion into a
service, and the reason a professional can test something a criminal would be arrested
for touching. Understanding this reframes authorization as a *capability*, not a
formality.

## Defender's view

Defenders should assume testing happens and design for it. That means a named owner for
the authorization, an up-to-date asset inventory so scope can be described accurately,
and a channel for a tester to raise something urgent mid-engagement. An organization that
cannot say which systems it owns cannot lawfully authorize anyone to test them.

The defender's counterpart to authorization is **detection**: if your own sanctioned
tester can move through your network without tripping anything, so can someone who did
not sign the paperwork. Authorization controls who is *permitted* to attack you.
Detection and logging control what actually happens when someone does.

## Key concepts

**Authorization, not permission.** Permission may be informal; authorization is
documented, scoped, and from a person with the standing to grant it. The difference
matters the first time someone is surprised by your traffic.

**Scope.** An explicit list of in-scope systems *and* explicit out-of-scope systems. If a
host appears to be in scope but is not listed, it is out of scope until confirmed in
writing. Real incidents happen when a tester "helpfully" tests an adjacent system.

**Rules of engagement.** The operating rules: permitted techniques, prohibited
techniques, testing windows, rate limits, whether social engineering is allowed, and what
to do when something breaks.

**Stop condition.** The pre-agreed trigger for halting the test — a production outage, a
safety system affected, or a finding so severe the client needs to act immediately.
Agree it *before* you start, while everyone is calm.

**Safe harbor.** Some organizations and platforms publish a formal policy stating that
good-faith research within defined limits will not be pursued legally. It is meaningful
only if it is explicit and from the right party.

## The boundary this course will not cross

This course will give you working knowledge of real offensive techniques, inside labs
defined on hardware and virtual machines that you own or that this environment provides.
It will not, at any point, direct you to test a system belonging to a third party, and
you should not. If you want to test something real, the path is: own it, or get written
authorization from someone who does.

## Further reading

- NIST SP 800-115, *Technical Guide to Information Security Testing and Assessment*.
- The Penetration Testing Execution Standard (PTES) on pre-engagement interactions.
- Your jurisdiction's computer-misuse statute, read in the original. Know exactly what
  words describe the thing you have agreed to do.
