#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_IP:-}" ] || FLAG_IP=\'FLAG{ip-default}\'
[ -n "${FLAG_PATH:-}" ] || FLAG_PATH=\'FLAG{path-default}\'
[ -n "${FLAG_EXFIL:-}" ] || FLAG_EXFIL=\'FLAG{exfil-default}\'

mkdir -p /var/evidence
cat > /var/evidence/access.log <<LOG
10.42.0.14 - - [12/Nov/2026:08:01:12 +0000] "GET / HTTP/1.1" 200 4120 "-" "Mozilla/5.0"
10.42.0.22 - - [12/Nov/2026:08:02:05 +0000] "GET /assets/app.js HTTP/1.1" 200 18422 "-" "Mozilla/5.0"
198.51.100.77 - - [12/Nov/2026:08:14:01 +0000] "GET /robots.txt HTTP/1.1" 200 124 "-" "curl/8.5.0"
198.51.100.77 - - [12/Nov/2026:08:14:04 +0000] "GET /.env HTTP/1.1" 404 153 "-" "curl/8.5.0"
198.51.100.77 - - [12/Nov/2026:08:14:19 +0000] "POST /api/debug/upload?token=${FLAG_IP} HTTP/1.1" 200 88 "-" "python-requests/2.31"
198.51.100.77 - - [12/Nov/2026:08:15:02 +0000] "GET /uploads/shell.sh HTTP/1.1" 200 512 "-" "python-requests/2.31"
10.42.0.14 - - [12/Nov/2026:08:16:40 +0000] "GET /health HTTP/1.1" 200 15 "-" "kube-probe/1.30"
LOG

cat > /var/evidence/auth.log <<LOG
Nov 12 08:10:01 web-prod-01 sshd[1021]: Accepted publickey for deploy from 10.42.0.5 port 51200 ssh2
Nov 12 08:15:11 web-prod-01 sudo[1884]: www-data : TTY=unknown ; PWD=/var/www ; USER=root ; COMMAND=/usr/bin/tar -czf /tmp/.cache-${FLAG_PATH}.tgz /etc/shadow /var/backups/db.sql
Nov 12 08:15:19 web-prod-01 sshd[1901]: Failed password for invalid user admin from 198.51.100.77 port 44112 ssh2
LOG

cat > /var/evidence/exfil-manifest.json <<JSON
{
  "incident_id": "INC-2026-1112",
  "detected_at": "2026-11-12T08:18:00Z",
  "dns_egress_queries": [
    "cdn.example.com",
    "exfil-chunk-1.evil-drop.invalid",
    "checksum.${FLAG_EXFIL}.evil-drop.invalid"
  ]
}
JSON

chmod -R a+rX /var/evidence

cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m10-log-analysis-forensics ===
Evidence directory: /var/evidence/
Files: access.log, auth.log, exfil-manifest.json

Objectives (3 Flags):
1. [initial_access] Inspect /var/evidence/access.log to find the attacker's debug upload token flag.
2. [staging]        Inspect /var/evidence/auth.log to find the hidden staging archive flag.
3. [exfil]          Inspect /var/evidence/exfil-manifest.json to find the DNS exfiltration flag.
TXT
chown student:student /home/student/README-LAB.txt
