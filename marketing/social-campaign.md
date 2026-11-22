# Blackwire — Social Media Launch Campaign

Ready-to-publish copy across X/Twitter, LinkedIn, Reddit, and Discord/Slack. Pair with the visuals in `marketing/assets/`.

---

## 1. X / Twitter Launch Thread (6 Posts)

**Post 1 (Hook — attach `blackwire-banner-16x9.jpg`)**
Most cybersecurity courses make you choose:
- Dry theory with zero hands-on muscle memory
- Or CTF sandboxes that teach exploitation without defense, detection, or the law

We built **Blackwire**: an air-gapped KVM cyber range where every attack is taught alongside the control that stops it.

Here's what's inside 🧵

**Post 2 (The KVM Range)**
1/ Real Linux GUI VMs — streamed straight to the browser.

No VirtualBox networking nightmares on day one. Every student boots a private, zero-egress Debian 12 desktop in seconds with:
• Per-student dynamic flags (no flag sharing)
• One-click snapshot rollback
• 15 live hands-on scenarios

**Post 3 (The Dual-Lens Curriculum)**
2/ 17 modules (~30 hours) mapped to 56 MITRE ATT&CK techniques.

Every single module is build-validated to include:
→ Attacker's view (real mechanics)
→ Defender's view (root-cause controls + detection)
→ Ethics & legal boundary (CFAA, UK CMA, EU Directive 2013/40)

If any one is missing, CI fails the build.

**Post 4 (Modern Threat Surface)**
3/ Built for the threats teams actually face today — not 2012 lab boxes:
• Modern API, OAuth & JWT attacks
• Network PCAP forensics (`tcpdump` + Python)
• Containers, CI/CD & Cloud IMDS escapes
• AI & LLM attack surface (OWASP LLM Top 10)
• Static/dynamic binary triage
• Live ransomware IR & recovery

**Post 5 (Built for Instructors)**
4/ Designed for real classrooms and cohorts:
• Live Instructor Screen Wall — watch every VM in real time
• Interactive Assist — jump in when a student stalls
• Server-side grading — answer keys never touch the browser
• Rubrics, CSV roster import, class analytics & gradebook export

**Post 6 (CTA — attach `blackwire-social-square.jpg`)**
5/ Blackwire is open by invite for instructors, security teams, and cohort learners.

Preview the first modules and try the interactive incident walkthrough now:
https://blackwire.deadplug.digital

Offensive security, taught defensively.

---

## 2. Standalone X / Twitter Posts

### Post A — Instructor Pain Point
Teaching a cybersecurity lab shouldn't mean spending the first 2 weeks debugging VirtualBox on 30 different laptops.

With **Blackwire**, every student boots an air-gapped Debian 12 KVM desktop in their browser in seconds — with live instructor shadowing and one-click snapshot rollback.

https://blackwire.deadplug.digital

### Post B — AI & Modern Threats
Every org is wiring LLMs into internal workflows and accidentally turning untrusted text into executable authority.

Module 11 of **Blackwire** puts students inside a live isolated VM to test prompt injection, tool-abuse paths, and OWASP LLM Top 10 defenses hands-on.

https://blackwire.deadplug.digital

### Post C — Detection Engineering Angle
An attack that isn't detected isn't a defended incident.

In **Blackwire**, students don't stop at getting root. They pivot straight into writing detections, inspecting PCAPs, triaging binaries, and writing executive-ready incident reports.

17 modules. 15 live KVM labs. Zero egress.
https://blackwire.deadplug.digital

---

## 3. LinkedIn Posts

### LinkedIn Post 1 — Launch Announcement (For Security Leaders & Educators)
**Attach:** `blackwire-banner-16x9.jpg`

**Headline:** Why we built Blackwire: Offensive security, taught defensively.

Over the past few years, the gap between how security is taught and how incidents actually unfold has only widened. Too many programs either stay safely in slide decks—never touching a real shell, PCAP, or vulnerable API—or drop learners into gamified CTFs that reward popping boxes without ever asking: *How would we detect this? What control eliminates the root cause? Where is the legal boundary?*

Today we're introducing **Blackwire** — an invite-only cyber range and 17-module curriculum built for classrooms, bootcamps, and internal security teams.

What makes Blackwire different:
🔹 **Browser-streamed, air-gapped KVM VMs:** Every learner boots a private, zero-egress Debian 12 desktop in seconds, with per-student dynamic flags and one-click snapshot rollback.
🔹 **Two views of every technique:** Every module pairs attacker mechanics with defensive controls, detection engineering, and explicit legal/ethical boundaries.
🔹 **2026-era threat coverage:** Beyond web apps and Linux privesc, the syllabus covers API/OAuth/JWT security, container & CI/CD cloud identity, AI/LLM attack surfaces, binary triage, and live ransomware incident response.
🔹 **A real instructor console:** Supervise an entire cohort from a live screen wall, toggle interactive assist when someone stalls, and grade submissions server-side with rubrics and CSV exports.

If you run a university security track, a bootcamp cohort, or a SOC/AppSec upskilling program and want to pilot Blackwire, drop a comment or DM for an invite code.

#CyberSecurity #InfoSec #CyberRange #BlueTeam #RedTeam #SecurityEducation #MITREATTACK

---

### LinkedIn Post 2 — Behind the Architecture (Technical Credibility)
**Attach:** `blackwire-social-square.jpg`

A small engineering detail we're proud of in **Blackwire**:

In our curriculum pipeline, `npm run check:curriculum` automatically fails the build if *any* module is missing:
1. At least one concrete defensive control
2. A specific ethics boundary and legal note
3. A constrained lab environment (`sandbox | host | analysis | read-only`)
4. Server-side validated assessment keys (which are stripped before HTML ever reaches the browser)

We didn't want "defensive mindset" to be marketing copy on a landing page. We wanted it enforced by the compiler and CI pipeline.

17 modules. 15 live air-gapped KVM scenarios. 56 MITRE ATT&CK techniques.

If you're an instructor or security lead looking for a self-hostable, zero-egress cyber range for your next cohort, let's talk.

#AppSec #DetectionEngineering #CyberSecurityTraining #KVM #DevSecOps

---

## 4. Community Posts (Reddit / Discord / Slack)

### Reddit (`r/cybersecurity` or `r/netsecstudents` — value-first, non-spammy)
**Title:** Built an air-gapped KVM cyber range + 17-module dual-lens (red + blue) curriculum for classrooms & cohorts — looking for feedback from instructors and learners

**Body:**
Hey folks — I've been building **Blackwire**, a self-hostable teaching cyber range designed around a specific frustration: most labs either require painful local VM setups or teach offensive tricks without pairing them with detection engineering, root-cause fixes, and reporting.

A quick overview of how it's structured:
- **17 modules (~30 hrs)** across Foundation, Core, and Advanced tiers (covering Recon/OSINT, HID injection, Web Apps, API/OAuth/JWT, PCAP forensics, Linux privesc/persistence, Detection Engineering, Host Forensics, Containers/CI-CD/Cloud IMDS, AI/LLM Attack Surface, Binary Triage, Ransomware IR, and a full Capstone engagement + executive report).
- **15 live KVM lab scenarios:** Each student gets an isolated, zero-egress Debian 12 VM streamed in the browser with per-student dynamic flags and one-click snapshot rollback.
- **Instructor tools:** Live screen wall of active student VMs, interactive assist mode, server-side assessment grading (answer keys never hit the client), rubrics, and cohort stall analytics.
- **Strict scope:** Every module enforces Attacker View + Defender View + Legal/Ethics boundary at build time.

The first modules and an interactive incident preview are open to try without an account. Would love honest feedback—especially from anyone teaching university/bootcamp security courses or running internal SOC/AppSec training.

Link: https://blackwire.deadplug.digital

---

### Discord / Slack Announcement (For Invite-Only Cohorts)
> **⚡ BLACKWIRE — Cohort Enrollment Is Open**
>
> **Offensive security, taught defensively.**
>
> Boot your own air-gapped Debian 12 KVM desktop directly in the browser and work through **17 modules**, **15 live scenarios**, and **56 MITRE ATT&CK techniques** — from web/API exploitation and packet forensics to AI/LLM attacks, binary triage, and live ransomware IR.
>
> • Zero local VM setup — runs in your browser
> • Per-student dynamic flags + one-click snapshot rollback
> • Live instructor assist & server-side assessments
>
> 👉 **Enroll with your invite code:** `https://blackwire.deadplug.digital/register`  
> 👀 **Preview the syllabus:** `https://blackwire.deadplug.digital/modules`
