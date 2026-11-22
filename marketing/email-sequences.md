# Blackwire — Email Outreach & Onboarding Sequences

Ready-to-use templates for academic outreach, enterprise security teams, invite-code acceptance, and student onboarding. Replace bracketed `[PLACEHOLDERS]` before sending.

---

## 1. Cold Outreach — University Professors & Bootcamp Directors

**Subject:** Zero-setup air-gapped KVM labs for `[Course Name / Department]`
**Alt Subject:** Browser-streamed Linux cyber range for your next security cohort

Hi `[Name]`,

I saw you teach `[Course Name]` at `[Institution]`. One thing I hear constantly from security instructors is how much lab time gets burned debugging VirtualBox/VMware networking across students' personal laptops—or worrying about lab traffic leaking onto campus networks.

I built **Blackwire** to solve that for real classrooms:

- **Zero-egress KVM VMs in the browser:** Every student boots an isolated Debian 12 desktop in seconds with one-click snapshot rollback and per-student dynamic flags (no flag sharing).
- **17 modules, dual-lens by design:** Every attack technique is paired with the defensive control that stops it, the detection that catches it, and the legal boundary (CFAA / CMA / EU Directive). Covers web, API/JWT, PCAP forensics, privesc, detection engineering, cloud/containers, AI/LLM security, binary triage, and ransomware IR.
- **Built for teaching:** Live screen wall to monitor active student VMs, interactive assist when someone stalls, server-side grading (answer keys never touch the browser), rubrics, CSV roster import, and gradebook export.

Would you be open to a 10-minute walkthrough—or an instructor invite code so you can boot a lab VM yourself this week?

Best,  
`[Your Name]`  
Blackwire · Deadplug Digital  
`hello@deadplug.digital` · `https://blackwire.deadplug.digital` (or `https://learn.deadplug.digital`)

---

## 2. Cold Outreach — Enterprise Security Leaders (CISOs / SOC / AppSec Leads)

**Subject:** Hands-on red/blue range for `[Company]`'s security team (zero egress, self-hostable)
**Alt Subject:** Training SOC & AppSec teams on JWT, Cloud IMDS, AI/LLM, and Ransomware IR

Hi `[Name]`,

Most security training either stays in compliance videos or turns into CTF trivia that doesn't translate to Monday morning triage.

**Blackwire** is a self-hostable, air-gapped KVM cyber range built to close the gap between offensive mechanics and defensive execution. Inside private, browser-streamed Debian 12 VMs, engineers work through **15 live scenarios** across **56 MITRE ATT&CK techniques**, including:

- **Modern API, OAuth & JWT flaws** (BOLA, mass assignment, broken signature verification)
- **Containers, CI/CD & Cloud IMDS** pivots and boundary hardening
- **AI & LLM Attack Surface** (prompt injection and tool-authority controls)
- **Static/Dynamic Binary Triage** and **Live Ransomware Incident Response & Recovery**

Every lab pairs the exploit with detection engineering, log forensics, and root-cause remediation—and the entire platform deploys as a standalone Docker container with zero external telemetry.

Happy to send over a 1-page syllabus overview or spin up a sandbox invite for you and a lead analyst to test. Worth a quick look?

Best,  
`[Your Name]`  
Blackwire · Deadplug Digital  
`hello@deadplug.digital` · `https://blackwire.deadplug.digital` (or `https://learn.deadplug.digital`)

---

## 3. Waitlist → Invite-Code Acceptance Email

**Subject:** Your Blackwire invite code is ready

Hi `[Name]`,

Your seat in the **Blackwire Cyber Range** is open.

Blackwire is built on a simple premise: *offensive security, taught defensively.* Across 17 modules and 15 live air-gapped KVM scenarios, you'll practise real attacker mechanics inside private Linux VMs streamed to your browser—and immediately pair every technique with the controls, detections, and forensic artifacts that stop it.

**Your Enrollment Details**
- **Portal:** `https://blackwire.deadplug.digital/register`
- **Invite Code:** `[INVITE-CODE]`
- **Class Join Code (if applicable):** `[JOIN-CODE]`

**Before your first lab:**
1. Start with **Module 01 (Ethics, Law, and Authorization)** and **Module 02 (Building a Safe Lab)**.
2. All practical work runs inside your private, zero-egress KVM sandbox—never target systems outside the range.
3. If you hit a snag in a lab, you can roll back your VM snapshot in one click or request live instructor assist.

See you on the range,  
**The Blackwire Team**

---

## 4. Cohort Kickoff Email (From Instructor to Enrolled Students)

**Subject:** Welcome to `[Class Name]` on Blackwire — Week 1 instructions

Hi everyone,

We're running our hands-on labs this term on **Blackwire**, an isolated KVM cyber range you can access directly from your browser—no local VM software required.

**Get set up before `[Date]`:**
1. Create your account at `https://blackwire.deadplug.digital/register` using invite code **`[INVITE-CODE]`**.
2. Join our class with join code **`[JOIN-CODE]`**.
3. Complete **Module 01: Ethics, Law, and Authorization** and boot your first sandbox VM in **Module 02**.

**A few ground rules:**
- Every lab generates **per-student dynamic flags**—work in your own VM and document your steps in the built-in Notes panel.
- Assessments are graded server-side; read the explanations once unlocked.
- Use the class Discussion thread for questions, and flag me during live lab hours if you want me to hop into your VM via Interactive Assist.

Looking forward to a great cohort,  
`[Instructor Name]`
