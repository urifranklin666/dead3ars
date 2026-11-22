---
id: m17-ransomware-incident-response
order: 17
title: "Ransomware Incident Response and Recovery"
tier: advanced
minutes: 120
summary: >-
  Ransomware is the highest-impact operational crisis most defenders will face. You will
  step into an active simulated ransomware incident inside your isolated VM: contain the
  rogue encryptor process, preserve ransom and forensic artifacts, verify backup integrity,
  and recover encrypted files cleanly without paying a ransom.
objectives:
  - Execute rapid containment (identifying and halting an active encryption process without destroying volatile evidence).
  - Triage ransom notes, encryption artifacts, and intrusion entry points to scope the blast radius.
  - Verify offline/immutable backup integrity and execute a clean restoration test.
  - Document the containment, eradication, recovery, and post-incident hardening playbook.
mitre: ["T1486", "T1490", "T1489", "T1059"]
cwe: ["CWE-284", "CWE-732"]
csf: ["RS.MI-01", "RS.AN-03", "RC.RP-01", "PR.DS-11"]
owasp: []
attackTechniques:
  - "Data Encrypted for Impact (T1486)"
  - "Inhibit System Recovery (T1490)"
  - "Service Stop (T1489)"
defenses:
  - Maintain immutable, offline (3-2-1-1-0) backups isolated from production domain credentials
  - Segment networks and enforce MFA on all remote access and backup-console accounts to prevent rapid lateral encryption
  - Alert immediately on mass file-rename bursts, shadow-copy/backup deletion (T1490), and anomalous service stops
  - Rehearse tabletop and live recovery drills so RTO/RPO targets are proven before an incident hits
lab:
  name: "Contain a simulated ransomware outbreak and verify clean backup recovery"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM VM, which simulates a compromised file server mid-incident:
    a benign mock encryptor service is running, a ransom note and encrypted files sit under
    /srv/fileshare/, and an isolated read-only backup vault exists under /var/backups/immutable/.
    You will contain the rogue service, triage the intrusion, and recover the files cleanly.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and read ~/README-LAB.txt and /srv/fileshare/README-RESTORE-FILES.txt."
      expect: "You see the simulated ransom note, affected .locked files, and incident scope clues."
    - do: "Identify the active simulated encryptor process ('ps aux | grep crypt' or 'systemctl list-units') and inspect its service unit (/etc/systemd/system/mock-ransom.service) to capture the [contain] flag."
      expect: "You locate the rogue process/unit and extract FLAG{contain_...}."
    - do: "Inspect /var/log/ir-timeline.log to determine how the attacker gained initial access and attempted backup deletion (T1490), capturing the [root_cause] flag."
      expect: "You identify the initial-access vector and capture FLAG{root_cause_...}."
    - do: "Verify the immutable backup under /var/backups/immutable/fileshare-clean.tar.gz (check its SHA-256 against manifest.sha256), restore it to /tmp/recovered/, and read the verified recovery flag."
      expect: "Checksum verification passes and /tmp/recovered/recovery.flag yields FLAG{recover_...}."
    - do: "In your notes, write a 5-step executive IR brief: containment action, root cause, recovery status, legal/notification considerations, and top 2 hardening priorities."
      expect: "A concise, decision-ready IR update."
  success:
    - Identified and scoped the active mock encryptor ([contain])
    - Traced initial access and recovery-inhibition attempt in /var/log/ir-timeline.log ([root_cause])
    - Verified immutable backup integrity and restored cleanly ([recover])
  cleanup:
    - "Click 'Stop VM' when finished. All simulated artifacts stay strictly inside your ephemeral VM."
ethics:
  boundary: >-
    Never build, test, or deploy real file-encrypting ransomware — even in a lab, accidental
    escape can cause irreversible data loss. Only use benign, reversible simulations.
  legal: >-
    Deploying ransomware or extorting organizations is a severe felony worldwide; during real
    IR, paying sanctioned threat actors can also violate OFAC/sanctions regulations.
  disclosure: >-
    Real ransomware incidents often trigger mandatory breach-notification timelines (GDPR,
    SEC, HIPAA, state laws) — preserve forensic evidence and involve legal counsel early.
assessment:
  - q: "Why do ransomware operators target backups and Volume Shadow Copies (T1490) before encrypting production data?"
    options:
      - "To free up disk space for faster encryption."
      - "To eliminate the victim's ability to recover cleanly without paying the ransom."
      - "To improve network throughput."
      - "Because encryption fails if backups exist."
    answer: 1
    explain: >-
      If a victim has intact, offline, immutable backups, the attacker's leverage collapses.
      Destroying or encrypting reachable backups is therefore a standard precursor step in
      human-operated ransomware playbooks.
  - q: "What is the first operational priority when active ransomware encryption is detected on a host?"
    options:
      - "Immediately pay the ransom before the timer expires."
      - "Isolate affected hosts/segments from the network to stop lateral spread while preserving volatile forensic evidence."
      - "Reboot every server in the data center simultaneously."
      - "Delete all log files to save storage."
    answer: 1
    explain: >-
      Network isolation halts propagation to healthy servers and backups without wiping
      memory or logs needed to determine root cause and data-exfiltration scope.
  - q: "What does the extra '1' in the 3-2-1-1-0 backup rule represent?"
    options:
      - "One backup stored in the same folder as production."
      - "At least one immutable or air-gapped offline copy that production credentials cannot delete or overwrite."
      - "One unencrypted USB stick on the admin's desk."
      - "One backup per year."
    answer: 1
    explain: >-
      3 copies, 2 media types, 1 offsite, 1 immutable/offline, and 0 errors after automated
      restore verification — immutability ensures even domain-admin compromise cannot wipe
      the last line of recovery.
  - q: "Why is 'double extortion' (exfiltrating data before encrypting) a critical factor in ransomware IR?"
    options:
      - "It doubles the CPU load of encryption."
      - "Even if you restore completely from backups, stolen sensitive data creates regulatory breach-notification and extortion risks that must be scoped."
      - "It encrypts every file twice with AES."
      - "It only affects Linux systems."
    answer: 1
    explain: >-
      Modern ransomware crews routinely exfiltrate databases and file shares before
      detonation. Responders must investigate egress/staging logs, not just restore disks.
  - q: "Why must root cause be eradicated before restoring systems back onto the production network?"
    options:
      - "Backups cannot be extracted until logs are read."
      - "If the initial access path, compromised credentials, or persistence remains, the attacker can re-encrypt the freshly restored environment."
      - "Restored servers automatically delete user accounts."
      - "Firewalls block restored hosts by default."
    answer: 1
    explain: >-
      Re-encryption incidents happen when teams rush restoration onto a still-compromised
      network without rotating credentials, patching the entry vector, and sweeping for
      persistence.
---

## Scenario

At 06:10 UTC, a file server begins appending `.locked` to shared documents and drops a
ransom note demanding payment within 48 hours. Your team must stop the bleeding, figure
out how the attacker got in, verify whether the offline immutable backup survived intact,
and prove clean recovery.

## Attacker's view

Human-operated ransomware is rarely a drive-by infection. The operator spends days inside
the network: gaining initial access via exposed VPN/RDP or phished credentials, escalating
to domain or backup admin, exfiltrating sensitive shares, disabling recovery (`T1490`),
and finally launching encryption (`T1486`) across every reachable host simultaneously.

## Defender's view

Surviving ransomware is decided **before** detonation and executed calmly **after**:

1. **Contain fast:** Isolate compromised hosts/subnets and stop rogue encryption processes
   without wiping logs.
2. **Scope root cause & exfil:** Trace how they entered, which credentials were compromised,
   and whether data left the network.
3. **Verify before restoring:** Validate checksums on immutable offline backups, restore
   into a clean environment after rotating credentials, and confirm persistence is gone.

## Key concepts

* **Inhibit System Recovery (T1490):** Targeting backups, snapshots, and shadow copies.
* **3-2-1-1-0 Immutable Backups:** Ensuring compromised admin credentials cannot destroy recovery media.
* **Containment → Eradication → Verified Recovery:** Never reconnect restored hosts until the entry vector is closed.
