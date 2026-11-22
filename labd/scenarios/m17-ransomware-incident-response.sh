#!/usr/bin/env bash
set -euo pipefail

mkdir -p /srv/fileshare
mkdir -p /var/log
mkdir -p /var/backups/immutable

FLAG_CONTAIN="${FLAG_CONTAIN:-FLAG{contain-default}}"
FLAG_ROOT_CAUSE="${FLAG_ROOT_CAUSE:-FLAG{root_cause-default}}"
FLAG_RECOVER="${FLAG_RECOVER:-FLAG{recover-default}}"

# === Part 1: Ransom note ===
cat > /srv/fileshare/README-RESTORE-FILES.txt << 'NOTEDOC'
====================================================================
              YOUR FILES HAVE BEEN ENCRYPTED
====================================================================

To decrypt your files, send 0.5 BTC to:
  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

Payment window: 48 hours from detection.
After expiry, encryption keys will be deleted.

INCIDENT ID: INC-2026-RANSOM-001
Contact: decode@onion-address.onion

This is a simulated exercise - do NOT send Bitcoin.
====================================================================
NOTEDOC

# === Part 2: Dummy locked files ===
for f in quarterly-report.xlsx employee-records.csv project-timeline.mpp; do
    echo "This was a real file before encryption." > "/srv/fileshare/${f}"
    echo "ENCRYPTED: ${f}" >> "/srv/fileshare/${f}"
    cp "/srv/fileshare/${f}" "/srv/fileshare/${f}.locked"
    rm "/srv/fileshare/${f}"
done

# === Part 3: Mock ransomware service ===
cat > /usr/local/bin/mock-ransom-crypt.py << 'PYEOF'
import time, signal, sys

def handler(sig, frame):
    print("[mock-ransom] Received signal, shutting down.", flush=True)
    sys.exit(0)

signal.signal(signal.SIGTERM, handler)
signal.signal(signal.SIGINT, handler)

while True:
    time.sleep(60)
PYEOF
chmod +x /usr/local/bin/mock-ransom-crypt.py

cat > /etc/systemd/system/mock-ransom.service << UNIT
[Unit]
Description=Simulated Ransomware Encryptor (m17 lab)
After=network.target

[Service]
Type=simple
Environment=ENCRYPTOR_KEY=${FLAG_CONTAIN}
Environment=TARGET=/srv/fileshare
ExecStart=/usr/bin/python3 /usr/local/bin/mock-ransom-crypt.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now mock-ransom.service

# === Part 4: IR Timeline log ===
cat > /var/log/ir-timeline.log << IRLOG
[2026-11-22T02:00:00Z] T1190  Initial Access: User clicked phishing link - credentials harvested via fake login page [INCIDENT_REF=${FLAG_ROOT_CAUSE}]
[2026-11-22T02:05:00Z] T1078  Credential Usage: Attacker authenticated with harvested credentials (admin@company.com)
[2026-11-22T02:10:00Z] T1046  Service Discovery: Attacker enumerated shares on file server 10.0.1.50
[2026-11-22T02:15:00Z] T1548  Privilege Escalation: Abused misconfigured sudo rule to obtain root shell
[2026-11-22T02:20:00Z] T1083  File Discovery: Located critical files in /srv/fileshare/
[2026-11-22T02:25:00Z] T1070.001  Indicator Removal: Cleared bash history and known_hosts
[2026-11-22T02:30:00Z] T1490  Inhibit System Recovery: Deleted Volume Shadow Copies (vssadmin delete shadows /all)
[2026-11-22T02:35:00Z] T1490  Inhibit System Recovery: Stopped backup service (systemctl stop backup-agent)
[2026-11-22T02:40:00Z] T1486  Data Encrypted for Impact: Mass encryption of /srv/fileshare/ initiated
[2026-11-22T02:45:00Z] T1489  Service Stop: Attempted to stop critical services to impede recovery
IRLOG
chmod a+r /var/log/ir-timeline.log

# === Part 5: Immutable backup with recovery flag ===
BACKUP_DIR=$(mktemp -d)
chmod 755 "${BACKUP_DIR}"
echo "recovery.flag: ${FLAG_RECOVER}" > "${BACKUP_DIR}/recovery.flag"
echo "file-001 quarterly-report.xlsx" > "${BACKUP_DIR}/file-001"
echo "file-002 employee-records.csv" > "${BACKUP_DIR}/file-002"
echo "file-003 project-timeline.mpp" > "${BACKUP_DIR}/file-003"
cat > "${BACKUP_DIR}/README.txt" << BACKUPDOC
=== Fileshare Backup ===
Backup date: 2026-11-21T23:00:00Z
Status: VERIFIED CLEAN
BACKUPDOC

tar czf /var/backups/immutable/fileshare-clean.tar.gz -C "${BACKUP_DIR}" .
rm -rf "${BACKUP_DIR}"

cd /var/backups/immutable
sha256sum fileshare-clean.tar.gz > manifest.sha256
cd /

chmod a+r /var/backups/immutable/fileshare-clean.tar.gz /var/backups/immutable/manifest.sha256

cat > /home/student/README-LAB.txt << 'TXT'
=== DEAD3ARS LAB: m17-ransomware-incident-response ===

You are responding to an active simulated ransomware incident.

Current State:
  - /srv/fileshare/ contains the ransom note + locked files
  - A mock encryptor process is running (mock-ransom.service)
  - /var/log/ir-timeline.log documents the attack timeline
  - An immutable backup exists at /var/backups/immutable/

Objectives (3 Flags):
1. [contain]    Identify and inspect the active mock encryptor:
                  systemctl status mock-ransom.service
                  The service unit contains the ENCRYPTOR_KEY environment variable.
2. [root_cause] Inspect /var/log/ir-timeline.log to determine:
                  - How the attacker gained initial access
                  - What T1490 (inhibit recovery) actions were taken
                  The root cause flag is embedded in the timeline.
3. [recover]    Verify the immutable backup:
                  cd /var/backups/immutable
                  sha256sum -c manifest.sha256
                  tar tzf fileshare-clean.tar.gz
                  Extract and read recovery.flag from /tmp/recovered/

IR Workflow:
  Step 1: Contain - stop the mock-ransom.service
  Step 2: Scope - read /var/log/ir-timeline.log
  Step 3: Verify - check backup checksums
  Step 4: Restore - extract clean files from backup
  Step 5: Document - write your IR brief
TXT
chown student:student /home/student/README-LAB.txt
