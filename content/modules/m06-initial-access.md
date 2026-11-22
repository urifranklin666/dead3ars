---
id: m06-initial-access
order: 6
title: "Initial Access: Phishing and Public-Facing Services"
tier: core
minutes: 90
summary: >-
  How intrusions actually start: convincing a person, or reaching a service that is exposed
  by necessity. You will write a phishing simulation for your own controlled inbox, then
  examine what makes edge and VPN services such attractive targets.
objectives:
  - Describe the phishing kill chain and where it is interrupted in practice.
  - Write and run a phishing simulation against an inbox you control, following lab rules.
  - Explain why public-facing services are the preferred exploit target for T1190.
  - Map initial-access techniques to the controls that raise their cost.
mitre: ["T1566.001", "T1566.002", "T1190", "T1078", "T1598"]
cwe: ["CWE-287", "CWE-290", "CWE-1390"]
csf: ["PR.AA-03", "PR.AT-01", "DE.CM-03"]
owasp: ["A07:2025"]
attackTechniques:
  - "Phishing: Spearphishing Attachment (T1566.001)"
  - "Phishing: Spearphishing Link (T1566.002)"
  - "Exploit Public-Facing Application (T1190)"
  - "Phishing for Information (T1598)"
defenses:
  - Phishing-resistant multi-factor authentication such as hardware security keys, which a stolen password alone cannot satisfy
  - SPF, DKIM, and DMARC enforced with a reject policy, inbound and outbound
  - Retiring unnecessary internet-facing services and putting the rest behind patched, authenticated gateways
  - Treating scanning of edge devices as an alertable signal rather than a monthly curiosity
lab:
  name: "Triage a phishing email and deobfuscate a malicious dropper"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM VM to triage a realistic phishing email and attached shell
    dropper stored in /opt/triage/. You will inspect raw email headers for spoofing and
    campaign indicators, safely deobfuscate the encoded C2 check-in URL without running it,
    and document the awareness and technical controls that stop initial access.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and inspect /opt/triage/phish.eml and ~/README-LAB.txt."
      expect: "You see the raw email headers (From, Return-Path, Subject, X-Campaign-ID) and pretext."
    - do: "Identify the lookalike sender domain (payr0ll-update.invalid) and Return-Path mismatch, then extract the X-Campaign-ID value for the [header] flag."
      expect: "You capture FLAG{header_...} and note why SPF/DKIM/DMARC alignment would flag this message."
    - do: "Inspect /opt/triage/invoice_2026.sh without executing it. Locate the hex-encoded ENC string."
      expect: "You identify the obfuscated payload variable inside the script."
    - do: "Decode the hex string safely using python3 (bytes.fromhex(ENC).decode()) to reveal the C2 URL and capture the [ioc] flag."
      expect: "You recover your unique FLAG{ioc_...} and submit both flags above."
    - do: "In your notes, pair one user-awareness cue with two technical controls (such as phishing-resistant MFA and attachment sandboxing) that would have stopped this lure."
      expect: "Concrete preventive and detective controls recorded."
  success:
    - Analyzed raw phishing headers and captured the [header] flag
    - Safely deobfuscated the dropper IOC without executing it and captured the [ioc] flag
    - Documented awareness and technical controls for initial access
  cleanup:
    - "Click 'Stop VM' when finished. All triage artifacts stay confined inside your ephemeral VM."
ethics:
  boundary: >-
    This lab sends exactly one message, to an address you control, with no third party
    involved at any point. Phishing another person is not a lab exercise, it is social
    engineering against a human being who did not consent, and it is unlawful and harmful
    regardless of the payload being benign. The professional equivalent, in a real
    engagement, requires explicit written authorization naming social engineering as an
    in-scope technique.
  legal: >-
    Fraud and computer-misuse statutes frequently cover phishing: obtaining information by
    deception and unauthorized access are both offences, and the existence of an attachment
    or link makes the exposure worse. Even in an authorized penetration test, social
    engineering must be named in the rules of engagement before it may be used, because it
    targets people rather than systems.
  disclosure: >-
    If your simulation reveals a genuine weakness in a real mail system - for instance, a
    domain with no DMARC enforcement - report it privately to that domain's owner. Never test
    it by sending messages to that domain's users.
assessment:
  - q: "Which ATT&CK technique ID distinguishes a spearphishing message that carries a malicious file from one that carries only a link?"
    options:
      - "T1566.001 Spearphishing Attachment vs T1566.002 Spearphishing Link"
      - "T1598 Phishing for Information vs T1566 Phishing"
      - "T1190 Exploit Public-Facing Application"
      - "T1078 Valid Accounts"
    answer: 0
    explain: >-
      Both are sub-techniques of T1566, and the distinction is what the message delivers: an
      attachment to open, or a link to follow. It matters operationally because the controls
      differ - attachment sandboxing versus link rewriting and isolation - and analytically
      because a link-based message may end in credential theft rather than code execution.
  - q: "Why are public-facing services such as VPN gateways and file-transfer appliances the preferred target for T1190?"
    options:
      - "Because they contain more bugs than workstations."
      - "Because they must be reachable from the internet to do their job, so an attacker can attempt exploitation without needing any user to take an action."
      - "Because they are always unpatched."
      - "Because they are not logged."
    answer: 1
    explain: >-
      The defining property is reachability, and the consequence is that initial access no
      longer depends on a human being tricked. That removes the human defender from the loop,
      which is why these devices are patched aggressively, placed behind additional controls,
      and monitored closely in mature organisations.
  - q: "Why is T1598 (Phishing for Information) treated separately from T1566 (Phishing)?"
    options:
      - "Because it uses email and T1566 does not."
      - "Because the goal is to collect information, such as credentials or details useful for a later attack, rather than to gain access directly."
      - "Because it is not a real technique."
      - "Because it targets servers rather than people."
    answer: 1
    explain: >-
      T1598 is a Reconnaissance technique: the adversary is gathering information that enables
      a later intrusion. T1566 is the initial-access attempt itself. Separating them clarifies
      what stage of the campaign you are looking at, which in turn shapes whether an email is
      an attempt to enter or an attempt to learn.
  - q: "In an authorization document, why must social engineering be named explicitly if it is to be used?"
    options:
      - "Because it costs more to authorize."
      - "Because it targets people rather than systems, carrying different legal and duty-of-care implications, so it requires a distinct, explicit decision by the client."
      - "Because email gateways block it."
      - "Because it is illegal in every jurisdiction even when authorized."
    answer: 1
    explain: >-
      Technical testing affects systems; social engineering affects employees, who may
      experience real fear or reputational harm, and whose consent the client must secure.
      Mature rules of engagement therefore list it as a separate, opt-in technique, sometimes
      with named individuals excluded.
  - q: "Which control most directly reduces the value of a stolen password obtained by phishing?"
    options:
      - "Longer passwords."
      - "Phishing-resistant multi-factor authentication such as hardware security keys, which a stolen password alone cannot satisfy."
      - "Annual security-awareness training."
      - "Blocking macro execution in office documents."
    answer: 1
    explain: >-
      Phishing-resistant MFA is the control that breaks the T1566-to-T1078 chain: the attacker
      may obtain a password, but cannot complete authentication with it. Awareness training
      and macro blocking reduce other paths in the same chain, but only MFA-resistant-to-
      phishing directly neutralises a stolen credential.
---

Initial access is the phase where an intrusion stops being theoretical. This module covers
the two dominant routes: getting a person to act, and reaching a service that is exposed by
necessity.

## Scenario

You are helping a mid-sized organisation understand how intrusions begin, so you build a
phishing simulation for your own mailbox to study exactly which signals are observable, and
you examine what makes an internet-exposed appliance attractive to an attacker. The output
is a control recommendation, informed by having seen the attack from the sender's side.

## Attacker's view

**Deception.** A phishing message succeeds by being the most plausible thing in the
recipient's inbox at that moment. The pretext matters more than the payload: a delivery
notice while expecting a parcel, a document share while collaborating, a password expiry
while worried about access. The attacker chooses the emotion and then the lure.

The tradecraft is in the details. Link destinations can be made to look right; display names
are trivially spoofed; attachments can be types the organization routinely exchanges. What
the attacker cannot easily forge is *authentication*: SPF, DKIM, and DMARC results are
attached by the receiving server, and the alignment of the visible domain with the
authenticated domain is the part that is hardest to fake.

**Reach.** For an internet-exposed service, no human is needed. The attacker does not have
to convince anyone; they need only a flaw in something that must be reachable. This is why
edge devices are targeted relentlessly — the attack removes the human from the loop
entirely, and therefore removes the human defender too.

## Defender's view

Defense against initial access is layered and pragmatic.

- **Phishing-resistant MFA.** This is the highest-leverage control because it breaks the
  chain at the point the attacker expects to succeed. A stolen password that cannot
  authenticate is not initial access.
- **Email authentication.** Enforce SPF, DKIM, and DMARC so spoofing your domain is hard,
  and apply the same scrutiny inbound so messages claiming to be from partners are verified.
- **Reduce reachable surface.** Every internet-facing service is a candidate. Retire what is
  not needed, patch what is, and put the rest behind authentication that cannot be bypassed
  with a single factor.
- **Monitoring that treats scanning as a signal.** When someone starts probing an edge
  device, you want that in front of a human before the exploitation succeeds, not in a
  monthly report.

## Key concepts

**The kill chain and its interruptions.** A phishing attempt must arrive, be believed, be
acted upon, and produce an effect. Controls at any stage reduce the probability; the
strongest controls interrupt it early, before the user is the last line of defense.

**Authentication results are attached by the receiver.** SPF, DKIM, and DMARC judgements are
made and recorded at the receiving server, which is why they are the reliable technical
evidence.

**Removing the human removes the human defender.** Reaching an exposed service bypasses the
user but also bypasses the user's caution, which is why it is both attractive to attackers
and heavily defended in mature organisations.

## Further reading

- MITRE ATT&CK T1566 and its sub-techniques, and T1190.
- NIST guidance on phishing-resistant authentication and on DMARC deployment.
- OWASP Top 10 A07 Authentication Failures, for the weaknesses that phishing so often exploits.
