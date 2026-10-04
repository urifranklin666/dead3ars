---
id: m07-web-app-attacks
order: 7
title: "Web Application Attacks"
tier: core
minutes: 120
summary: >-
  The web application is where most externally reachable logic lives, and where the OWASP
  Top 10 categories were written. You will run a deliberately vulnerable application on your
  own lab VM and practise the canonical attacks against it, then fix them.
objectives:
  - Identify and exploit injection, broken access control, and authentication flaws in a lab app.
  - Explain the difference between reflected, stored, and DOM-based injection.
  - Map each class to its CWE identifier and OWASP category.
  - Remediate each flaw and re-test to confirm the fix.
mitre: ["T1190", "T1059.007", "T1005", "T1083"]
cwe: ["CWE-89", "CWE-79", "CWE-287", "CWE-284", "CWE-22", "CWE-352"]
csf: ["ID.RA-01", "PR.DS-01", "DE.CM-01"]
owasp: ["A01:2025", "A03:2025", "A05:2025", "A07:2025"]
attackTechniques:
  - "Exploit Public-Facing Application (T1190)"
  - "Command and Scripting Interpreter: JavaScript (T1059.007)"
defenses:
  - Parameterised queries for every database access, never escaped concatenation
  - Server-side authorization on every object access, placed next to the data access itself
  - Context-appropriate output encoding plus a content security policy
  - Session identifier regeneration on authentication and server-side expiry on logout
  - Alerting on patterns of denied authorization, which is where this class leaves a trace
lab:
  name: "Attack and repair a vulnerable web app"
  environment: sandbox
  brief: >-
    Run a deliberately vulnerable web application (for example an OWASP Juice Shop or an
    equivalent provided image) inside your isolated lab. Exploit three classes of flaw.
    Then patch each one and prove the exploit no longer works.
  steps:
    - do: "Deploy the vulnerable application in your lab VM and confirm it is reachable only from the host-only network."
      expect: "The app loads from the lab network and is not reachable from outside the lab."
    - do: "Find an injection flaw and demonstrate it. Record the exact request and response."
      expect: "A captured request that alters the application's behaviour, with both messages saved."
    - do: "Find a broken access control flaw - reach a resource or function belonging to another user or role."
      expect: "Evidence of access that should have been denied, with the request that achieved it."
    - do: "Find an authentication or session weakness. Show what it allows."
      expect: "A concrete impact such as session fixation or credential enumeration."
    - do: "Now switch sides. Patch each flaw in the application source or configuration."
      expect: "A specific code or configuration change per flaw, not a generic recommendation."
    - do: "Re-run the exact original requests against the patched application."
      expect: "Each exploit now fails, and you have the response proving it failed - for the same reason, not because the app broke."
  success:
    - Three exploited flaws, each with the request and response recorded
    - A specific patch for each, applied
    - Re-test evidence showing each exploit now fails
  cleanup:
    - "Revert the VM snapshot, or leave the patched application in place deliberately and note which state you are keeping."
ethics:
  boundary: >-
    The target is the vulnerable application provided for this lab, running on your own
    isolated network. Never point these techniques at a real website, including one you
    merely use, and including a site that appears to invite testing - some do not mean it, and
    none of them are in your lab. If a real site has a bug, the path is to report it, not to
    demonstrate it.
  legal: >-
    Testing a web application you do not own or have written authorization to test is
    unauthorized access under the CFAA, the UK Computer Misuse Act, and equivalent statutes,
    even if you only read data and change nothing. The fact that a form accepted your input
    does not make the subsequent request authorised. Also note that breaching a site's terms
    of service can carry civil liability independent of any criminal question.
  disclosure: >-
    If you find a genuine flaw in a real application, use its published security policy or a
    national CERT as the reporting channel. Include the minimum proof necessary, do not
    access other users' data to strengthen the report, and give the vendor a reasonable window
    before any public disclosure.
assessment:
  - q: "Which OWASP category and CWE identifier best describe a flaw where the application runs a query built by concatenating user input?"
    options:
      - "A01 Broken Access Control, CWE-284"
      - "A03 Injection, CWE-89 (SQL injection)"
      - "A07 Identification and Authentication Failures, CWE-287"
      - "A09 Logging Failures, CWE-778"
    answer: 1
    explain: >-
      Building a query from user input is injection, and when the target is a database the CWE
      is CWE-89. A03 also covers command injection (CWE-78) and cross-site scripting (CWE-79).
      The remediation is the same principle in each case: do not let data become code - use
      parameterised queries, not escaping.
  - q: "What distinguishes a stored XSS flaw from a reflected one?"
    options:
      - "Stored XSS only affects administrators."
      - "The payload is persisted by the application, so it is delivered to other users later without the attacker sending them anything further."
      - "Reflected XSS requires no user interaction."
      - "Stored XSS cannot be fixed."
    answer: 1
    explain: >-
      Persistence is the difference, and it changes severity: a reflected payload must be
      delivered to each victim, while a stored payload waits for them. DOM-based XSS is a
      third variant where the sink is in client-side code, and the server may never see the
      payload, which is why output encoding plus a content security policy is more reliable
      than input filtering alone.
  - q: "You can reach another user's record by changing an identifier in a request. Which weakness is this?"
    options:
      - "A03 Injection"
      - "A01 Broken Access Control - the application fails to check that the requester is entitled to the object, not just authenticated."
      - "A07 Identification and Authentication Failures"
      - "A04 Insecure Design"
    answer: 1
    explain: >-
      This is a broken object-level authorization flaw, and it is why A01 sits at the top of
      the OWASP list in recent editions. The fix is a server-side check on every object access
      - authentication tells you who the user is, authorization decides what they may touch,
      and the two are frequently conflated.
  - q: "You have confirmed a flaw in a real production site. What is the correct next step?"
    options:
      - "Exploit it fully so your report is more convincing."
      - "Report it privately through the site's security policy or a CERT, with minimal proof, and stop testing."
      - "Post it publicly to pressure a fix."
      - "Sell it to a broker."
    answer: 1
    explain: >-
      Minimal proof, private report, and stop. Extracting more data than necessary is itself an
      unauthorized access, weakens your position, and harms real users. Public disclosure
      before a fix exposes everyone who uses the site, and selling it weaponises the flaw
      against the public.
  - q: "A parameterised query and an escaped-and-concatenated query can look similar. Why is the parameterised form the correct fix?"
    options:
      - "Because it is faster."
      - "Because the query structure is fixed before user data is supplied, so the data can never be parsed as SQL syntax - whereas escaping is a filter that depends on getting every edge case right."
      - "Because escaping is deprecated."
      - "Because parameterised queries hide errors."
    answer: 1
    explain: >-
      The distinction between code and data is enforced by the database driver rather than by
      the developer's escaping logic. Escaping fails whenever a new syntax context or character
      set appears; parameterisation removes the possibility entirely, which is why it is the
      primary remediation rather than a hardening measure.
---

Web applications are where an organisation's custom logic lives, and therefore where its
custom bugs live. This module is the practitioner's introduction to finding and fixing them.

## Scenario

You stand up a deliberately vulnerable application in your lab — an OWASP Juice Shop or an
equivalent image is ideal. It is a training target by design, so exploiting it is the
intended use. Your job is to get in three different ways, and then to fix all three.

## Attacker's view

Most web flaws are variations on one idea: **the application trusted input it should not
have trusted**.

- **Injection (CWE-89, CWE-78, CWE-79, OWASP A03).** The application lets user-supplied data
  become part of a query, a command, or a page's script. The database runs your SQL, or the
  shell runs your command, or another user's browser runs your JavaScript. The reason it
  recurs is that the boundary between data and code is easy to blur in a string.
- **Broken access control (CWE-284, OWASP A01).** The application authenticates you, then
  forgets to authorise you. Change an identifier and you read someone else's record. This
  class sits at the top of the OWASP list because it is both common and high impact.
- **Authentication and session weaknesses (CWE-287, OWASP A07).** Weak credential handling or
  predictable sessions let an attacker become someone else without breaking anything.
- **Path traversal (CWE-22).** A filename parameter that accepts `../` lets a read intended
  for one directory escape into another.

The tradecraft is methodical: understand the application's inputs, watch how the server
responds to variation, and follow the data. The tooling is secondary.

## Defender's view

Every flaw above has a specific, non-negotiable fix, and "add a WAF" is not one of them.

- **Parameterise queries.** Never escape and concatenate. Let the driver keep code and data
  separate.
- **Authorise every object access server-side.** Authentication is not authorisation. The
  check belongs next to the data access, on the object, every time.
- **Encode output for its context, and add a content security policy.** This defends the XSS
  class even where a sink you have not found is hiding in client code.
- **Fix sessions properly.** Regenerate the session identifier on authentication, expire it
  server-side on logout, and never trust a client-supplied role.
- **Log and alert on authorization failures.** A sudden pattern of denied object accesses is
  an enumeration attempt, and it is one of the few places this class leaves a trace.

The re-test step is not a formality. A patch that breaks the feature, or that the original
request still defeats, is not a fix.

## Key concepts

**Data versus code.** Nearly every injection class is the same failure of this boundary in a
different language.

**Authentication vs authorization.** Who you are versus what you may touch. Confusing them is
the root of A01.

**Minimal proof in disclosure.** Enough to demonstrate, no more. Extracting extra data is a
further unauthorized act.

## Further reading

- OWASP Top 10:2025 (and the OWASP Cheat Sheet Series for remediation). Note that injection
  moved to A05 in this edition; the 2021 numbering placed it at A03.
- CWE-89, CWE-79, CWE-284, CWE-287, and CWE-22 entries, for the precise definitions.
- MITRE ATT&CK T1190 and T1059.007, for how these flaws appear as attacker techniques.
