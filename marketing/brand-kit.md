# Blackwire — Brand & Messaging Kit

> **Tagline:** *Offensive security, taught defensively.*  
> **Category:** Air-Gapped KVM Cyber Range & Cohort-Based Cybersecurity Academy  
> **Portal:** `https://blackwire.deadplug.digital` (alias: `https://learn.deadplug.digital`)  
> **Contact:** `hello@deadplug.digital`  
> **Audience:** University Cybersecurity Programs · Bootcamps & Instructors · Enterprise Security Teams · Invite-Only Practitioners

---

## 1. Brand Positioning

### Elevator Pitch (1 Sentence)
Blackwire is a browser-streamed, air-gapped KVM cyber range and 17-module security curriculum where every offensive technique is taught alongside the defensive control that stops it, the detection that catches it, and the law that governs it.

### Boilerplate (Short — ~60 words)
**Blackwire** is a teacher/student cyber range built for modern offensive and defensive security education. Students boot private, zero-egress Debian 12 virtual machines directly in the browser—complete with per-student dynamic flags and one-click snapshot rollback—while instructors supervise entire cohorts from a live screen wall, assist in real time, and grade submissions in a unified gradebook.

### Boilerplate (Long — ~120 words)
Most security training forces an artificial choice: dry slide decks with no hands-on depth, or chaotic CTF sandboxes that teach exploitation without defense, detection, or legal boundaries. **Blackwire** closes that gap. Across 17 structured modules (~30 hours of coursework) and 15 live KVM lab scenarios mapped to 56 MITRE ATT&CK techniques, learners work through the real modern threat landscape—identity and JWT/OAuth flaws, web apps, packet forensics, container and cloud escapes, AI/LLM prompt injection, binary triage, and live ransomware incident response. Every module enforces three non-negotiable lenses: the **Attacker's View**, the **Defender's View**, and the **Legal & Ethical Boundary**.

---

## 2. Core Messaging Pillars

| Pillar | Headline | Proof Points |
|---|---|---|
| **1. Real Air-Gapped KVM Range** | *Real Linux GUI VMs in your browser.* | Private, zero-egress Debian 12 desktops booted in seconds; 15 live lab scenarios; per-student dynamic flags (prevents flag-sharing); one-click snapshot rollback; zero local VirtualBox/VMware setup headaches. |
| **2. Dual-Lens Curriculum** | *Every attack paired with its defense.* | 17 modules across Foundation, Core, and Advanced tiers; 56 MITRE ATT&CK techniques; automated curriculum validator fails the build if a module lacks defensive controls, detection guidance, or legal boundaries. |
| **3. Live Instructor Console** | *Shadow, assist, and grade in real time.* | Live cohort screen wall; toggle interactive assist when a student stalls; server-side assessment grading (answer keys never touch the browser); rubrics, CSV roster import, class analytics, and gradebook CSV export. |
| **4. Ethics & Compliance First** | *Practise with authorisation.* | Opens with CFAA, UK Computer Misuse Act, and EU Directive 2013/40/EU; every lab targets only ephemeral student-owned sandboxes—never third parties; audit-logged auth, grading, and role changes. |

---

## 3. Audience Value Propositions

### For University Professors & Bootcamp Instructors
- **Zero lab-setup attrition:** Stop spending Week 1 debugging M-series Mac vs. Windows VirtualBox networking. Every student gets an identical Debian 12 KVM desktop in a browser tab.
- **Built for real classrooms:** Join codes, bulk CSV roster import, assignment rubrics, threaded class discussions, announcements, per-module stall analytics, and one-click gradebook export.
- **Anti-cheating by design:** Per-student dynamic lab flags and strictly server-side assessment grading (answer keys and explanations never reach the client HTML).
- **Live over-the-shoulder help:** Watch your cohort's live VMs from the Instructor Screen Wall and step in with interactive assist the moment someone gets stuck.

### For Enterprise Security Leaders (CISOs, SOC Managers, AppSec Leads)
- **Close the red/blue empathy gap:** Analysts don't just memorize alerts—they execute the attack inside a zero-egress sandbox, then write the Sigma/detection logic and fix the root cause.
- **Modern threat coverage:** Includes dedicated modules on **API/OAuth/JWT security**, **Containers, CI/CD & Cloud IMDS**, **AI/LLM Attack Surface (OWASP LLM Top 10)**, **Binary Triage**, and **Ransomware IR**.
- **Self-hostable & auditable:** Ships as a standalone Docker container backed by SQLite with zero external SaaS telemetry requirements—ideal for regulated environments.

### For Students & Practitioners (Invite-Only Academy)
- **No toy simulations:** Real Linux shells, real PCAPs (`tcpdump` & Python), real vulnerable web/API stacks, real binaries (`readelf`, `strace`), and a full capstone engagement with technical + executive reporting.
- **Learn how pros actually work:** You don't just pop a box—you learn to collect evidence, reconstruct timelines, write detections, and deliver reports a CISO can act on.

---

## 4. Voice & Tone Guidelines

- **Crisp, technical, zero-fluff:** Write like a seasoned principal security engineer who respects the reader's intelligence.
- **Dry, understated confidence:** Avoid hype words (*"revolutionary"*, *"military-grade"*, *"hack like a pro"*, *"10x"*). Let concrete technical details do the selling (*"zero-egress KVM"*, *"server-side grading"*, *"56 MITRE ATT&CK techniques"*).
- **Responsible, never preachy:** Treat authorization and legal boundaries as professional craft, not corporate legal boilerplate. (*"Everything in this course is legal, or it is a felony."*)
- **No stock hacker clichés:** Never use neon green Matrix rain, Guy Fawkes masks, or hoodies in dark rooms.

---

## 5. Visual Identity Tokens

Matches `src/app/globals.css` and `src/app/layout.tsx`:

| Token | Hex | Usage |
|---|---|---|
| **Background (`--color-bg`)** | `#090e1b` | Primary canvas / dark slate navy |
| **Panel (`--color-panel`)** | `#10192c` | Cards, surfaces, callout boxes |
| **Panel Elevated (`--color-panel-2`)** | `#17233a` | Secondary blocks, table headers |
| **Border (`--color-line`)** | `#273754` | Crisp 1px structural dividers |
| **Ink (`--color-ink`)** | `#f4f6ff` | Primary headlines & body copy |
| **Muted (`--color-muted`)** | `#a7b5cd` | Secondary copy, metadata |
| **Accent (`--color-accent`)** | `#a1bfff` | Primary highlight, `WIRE` in wordmark, CTAs |
| **Accent 2 (`--color-accent-2`)** | `#72dfbe` | Defensive/verified states, live indicators |
| **Warn (`--color-warn`)** | `#f6cb77` | Ethics/boundary callouts, due dates |
| **Danger (`--color-danger`)** | `#ff869d` | Offensive/alert indicators |

- **Primary Sans:** `Geist` (fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`)
- **Monospace:** `Geist Mono` (used for kickers, uppercase labels with `0.16em` tracking, MITRE IDs, and stats)
- **Wordmark:** `BLACK` in `#f4f6ff` + `WIRE` in `#a1bfff` (bold uppercase monospace, tracked `0.16em`)

---

## 6. Headline & Hook Bank

- *Learn how attacks work. Build better defenses.*
- *Offensive security, taught defensively.*
- *Real air-gapped KVM labs. Zero local VM headaches.*
- *Every attack technique paired with the control that stops it and the signal that reveals it.*
- *Stop teaching cybersecurity with slide decks.*
- *17 modules. 15 live Linux VMs. 56 MITRE ATT&CK techniques. Zero egress.*
- *Watch your entire cohort's live VMs—and step in the second someone stalls.*
