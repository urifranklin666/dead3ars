#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/capstone
cat > /opt/capstone/portal.py <<PY
import http.server, json, urllib.parse
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/config":
            self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers()
            self.wfile.write(json.dumps({"env":"prod","debug":True,"foothold":"${FLAG_WEB:-FLAG{web}}","ops_script":"/opt/capstone/deploy.sh"}).encode()); return
        self.send_response(200); self.send_header("Content-Type","text/html"); self.end_headers()
        self.wfile.write(b"<h1>Capstone Target (127.0.0.1:8080)</h1><!-- debug endpoint: /api/config -->")
http.server.ThreadingHTTPServer(("127.0.0.1", 8080), H).serve_forever()
PY
cat > /etc/systemd/system/capstone-web.service <<'UNIT'
[Unit]
Description=Dead3ars m12 Capstone Portal
After=network.target
[Service]
ExecStart=/usr/bin/python3 /opt/capstone/portal.py
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now capstone-web.service

cat > /opt/capstone/deploy.sh <<'SH'
#!/usr/bin/env bash
echo "Capstone deploy OK"
SH
chmod 777 /opt/capstone/deploy.sh
echo "student ALL=(root) NOPASSWD: /opt/capstone/deploy.sh" > /etc/sudoers.d/capstone
chmod 440 /etc/sudoers.d/capstone
echo "${FLAG_ROOT:-FLAG{root}}" > /root/capstone-root.flag
chmod 600 /root/capstone-root.flag
cat > /etc/cron.d/capstone-persist <<CRON
# Simulated attacker persistence
# PERSIST_FLAG=${FLAG_PERSIST:-FLAG{persist}}
*/30 * * * * root /bin/true
CRON
cat > /home/student/README-LAB.txt <<'TXT'
=== DEAD3ARS LAB: m12-capstone-and-reporting ===
Full-chain capstone box (http://127.0.0.1:8080 + local host):
Objectives (3 Flags):
1. [web]     Enumerate http://127.0.0.1:8080 to find the debug config endpoint and foothold flag.
2. [root]    Check sudo -l, escalate via /opt/capstone/deploy.sh, and read /root/capstone-root.flag.
3. [persist] Hunt /etc/cron.d/ for the persistence artifact and extract PERSIST_FLAG.
TXT
chown student:student /home/student/README-LAB.txt
