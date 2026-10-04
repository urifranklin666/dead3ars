---
id: m02-lab-hygiene
order: 2
title: "Building a Safe Lab and Handling Artifacts"
tier: foundation
minutes: 60
summary: >-
  Every technique from here on runs inside something you control. This module builds that
  place: an isolated virtual machine, a snapshot you can roll back, a private network with
  no path to the internet or your real LAN, and a habit of treating everything you generate
  as evidence.
objectives:
  - Build an isolated lab VM with host-only networking and no bridge to the real LAN.
  - Take and restore a snapshot, and prove the rollback actually reverted your change.
  - Explain why a "sandbox" that shares the host clipboard or a shared folder is not isolated.
  - Handle a generated artifact as evidence - hash it, record it, keep the chain intact.
mitre: []
cwe: []
csf: ["PR.AA-05", "PR.DS-01", "ID.AM-05"]
owasp: []
attackTechniques: []
defenses:
  - Host-only or internal virtual networking, with the physical NIC never bridged in
  - Snapshots taken before each exercise and verified by restoring one
  - A second, unrelated VM used for any payload that is designed to spread
lab:
  name: "Claim your range and roll it back"
  environment: sandbox
  brief: >-
    You will configure a throwaway virtual machine, prove it cannot reach the internet or
    your host network, make a deliberate change to it, snapshot, make a second change,
    revert, and prove the second change is gone. You will also hash an artifact and record
    it as evidence.
  steps:
    - do: "Create a VM (VirtualBox, VMware, or Hyper-V) and set its network adapter to a host-only or internal network. Do not use bridged."
      expect: "The VM has an IP address but cannot reach the internet or your physical LAN."
    - do: "From inside the VM, try to reach the internet and try to reach your host's LAN router; record both results."
      expect: "Both fail. If either succeeds, your isolation is not real - fix it before continuing."
    - do: "Disable shared folders and clipboard sharing between host and guest; try to copy a file across."
      expect: "No shared surface remains. Note why this matters: a shared folder is an escape path."
    - do: "Create a file in the VM, then run the provided artifact generator to produce a sample file with a known SHA-256 recorded in the module notes."
      expect: "You have a file and can state its hash."
    - do: "Take a snapshot. Then change the file. Then revert to the snapshot."
      expect: "The file is back to its original contents - and the hash matches the one you recorded."
  success:
    - A lab VM with no route to the internet and no shared surface with the host
    - A snapshot you have actually restored, with the file contents verified after revert
    - One artifact hashed and its digest recorded in your notes
  cleanup:
    - "Delete the throwaway files, then power the VM off. Keep the snapshot for the next module."
    - "Do not attach the VM to your real LAN to make anything easier."
ethics:
  boundary: >-
    A lab is a machine you own or one this course provides, with no path to anyone else's
    systems. Isolation is not a nice-to-have: a payload that was designed to spread will
    spread out of a bridged adapter, and it will be your name on the traffic. If you ever
    cannot describe where your VM's network goes, stop and fix it before you run anything.
  legal: >-
    Running attack tooling from a network you are responsible for can violate your
    provider's terms of service even when it stays inside your own VM, because the traffic
    may still originate from their address space. Keep the lab offline where you can. Note
    also that in the European Union, operating a test range may fall under the same
    directive (2013/40/EU) that criminalizes unauthorized access; your own systems are the
    one place consent is not in question.
  disclosure: >-
    Artifacts you generate here are evidence of your own learning. Keep them, hashed, with
    a note of when and how they were made. If you ever need to demonstrate that you built
    and understood a technique rather than committed it, that record is what you will show.
assessment:
  - q: "Your VM uses a bridged network adapter. Why is this a problem?"
    options:
      - "It is slower than host-only networking."
      - "The VM gets an address on the real LAN, so anything it sends - including attack traffic that spreads - goes out on your actual network."
      - "It prevents snapshots from working."
      - "It is fine as long as you only run known-safe tools."
    answer: 1
    explain: >-
      Bridged mode puts the guest directly on your physical network. A worming or
      self-propagating payload will attempt to reach neighbours, and that traffic leaves
      from your real address. Host-only or internal networking keeps the blast radius
      inside the host.
  - q: "Why must you actually restore a snapshot during this exercise rather than just taking one?"
    options:
      - "Snapshots expire after 24 hours."
      - "An untested snapshot is an assumption: a broken or partial snapshot only reveals itself when you need it, which is the moment you least want to discover it."
      - "It frees disk space."
      - "Restoring is required to boot the VM again."
    answer: 1
    explain: >-
      This is the same discipline as verifying a backup. You do not have a backup until you
      have restored one, and you do not have a safe rollback until you have reverted and
      confirmed the change is gone.
  - q: "You want to move a file from a lab artifact back to your host. What is the safe procedure?"
    options:
      - "Enable a shared folder temporarily - it is easier."
      - "Enable clipboard sharing and paste the contents."
      - "Base64 the file and paste it, avoiding the shared folder."
      - "Treat it as a document, not code: note its hash, and if you must transfer it, use a controlled method you understand and then re-isolate."
    answer: 3
    explain: >-
      A shared folder and a shared clipboard are both host-guest channels, and pasting a
      file as text is still moving it across. The professional habit is to treat generated
      artifacts as evidence: hash first, transfer deliberately over a method you can
      describe, and re-isolate the guest afterwards.
  - q: "In the EU, what is the significance of Directive 2013/40/EU to your lab?"
    options:
      - "It only applies to companies, not individuals."
      - "It criminalizes unauthorized access to information systems, which is why consent from the system owner is the thing that makes your work lawful."
      - "It requires all labs to be registered with the government."
      - "It has no bearing on a home lab."
    answer: 1
    explain: >-
      It is the EU's instrument against attacks on information systems. Your own systems are
      the one place consent is never in doubt, which is precisely why the lab is the right
      venue for this work.
---

Before you learn a single technique, build the place you will practise it. Every later
module assumes this environment exists and that you can undo anything you do inside it.

## Scenario

You are setting up your own training range. The goal is a machine where you can run
something destructive and be back to a clean state in under a minute, and where nothing
you do can reach the internet, your employer's network, or your family's devices. This is
the single most important piece of infrastructure in the course.

## Attacker's view

Real operators care intensely about operational security, and one of the first lessons is
containment: work somewhere that will not leak. An intrusion that spills into an
unrelated network creates witnesses, logs, and victims you did not choose. The same
discipline that protects an attacker from exposure is the one that protects you from
harming someone who did not consent — which is the only version of this that is legal.

Learning containment also builds the right instinct for later modules. When you reach
techniques that can propagate, the reflex to isolate is already there.

## Defender's view

Defenders see the mirror image: an organization's segmentation is what limits how far an
intruder gets. A flat network means one compromised workstation reaches everything. The
isolation you are building here — a boundary that permits only what you intend — is the
same design principle as network segmentation and micro-segmentation at scale.

Also note the evidence habit. When a defender finds an artifact, the chain of custody
matters. Hashing on first contact, recording context before touching, and never assuming
a file is benign because it looks benign are the same skills you are practising now.

## Key concepts

**Isolation is a property you verify, not a setting you choose.** You do not know your VM
is isolated because the dropdown said "host-only." You know because you tried to leave and
failed.

**Snapshots are backups, and backups are only real once restored.** Take one, restore it,
and check that the thing you changed came back.

**Every host-guest channel is an escape path.** Shared folders, shared clipboards, drag
and drop, and USB passthrough all link the two machines. Disable them for exercises.

**Evidence handling.** Hash the artifact the moment you create it, write down when and
how, and store the digest in your notes. This habit returns in the forensics module.

## Verification is the point

The step most people skip is the one that matters: proving the isolation holds and proving
the snapshot reverts. A lab that "should be" isolated is not isolated; it is a lab you have
not tested.

## Further reading

- Your hypervisor's documentation on networking modes: host-only, internal, NAT, bridged.
- NIST SP 800-86, *Guide to Integrating Forensic Techniques into Incident Response*, on
  evidence handling and chain of custody.
