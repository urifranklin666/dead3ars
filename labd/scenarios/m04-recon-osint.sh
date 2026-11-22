#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_ROBOTS:-}" ] || FLAG_ROBOTS='FLAG{robots}'
[ -n "${FLAG_META:-}" ] || FLAG_META='FLAG{meta}'
[ -n "${FLAG_DNS:-}" ] || FLAG_DNS='FLAG{dns}'
mkdir -p /opt/osint-target/.well-known /opt/osint-target/backup
cat > /opt/osint-target/index.html <<'HTML'
<!doctype html><html><body style="font-family:monospace;background:#0e1116;color:#e6edf3;padding:2rem">
<h1>Northstar Logistics (Simulated OSINT Target)</h1>
<p>Public corporate portal at <code>http://127.0.0.1:8080</code>. Check robots.txt, security.txt, and zone files.</p>
<!-- dev-note: staging manifest moved to /backup/dns-zone.txt -->
</body></html>
HTML
cat > /opt/osint-target/robots.txt <<TXT
User-agent: *
Disallow: /backup/
# recon-flag: ${FLAG_ROBOTS}
TXT
cat > /opt/osint-target/.well-known/security.txt <<TXT
Contact: mailto:sec@northstar.invalid
Policy: https://northstar.invalid/disclosure
# meta-flag: ${FLAG_META}
TXT
cat > /opt/osint-target/backup/dns-zone.txt <<TXT
\$ORIGIN northstar.invalid.
@       IN A     198.51.100.10
vpn     IN A     198.51.100.11
_audit  IN TXT   "${FLAG_DNS}"
TXT
cat > /etc/systemd/system/osint-target.service <<'UNIT'
[Unit]
Description=Blackwire m04 Simulated OSINT Target
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/osint-target
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now osint-target.service
cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m04-recon-osint ===
Target: http://127.0.0.1:8080 (use curl or Firefox)
Objectives (3 Flags):
1. [robots] Enumerate /robots.txt for disallowed paths and hidden comment flag.
2. [meta]   Inspect /.well-known/security.txt for the metadata flag.
3. [dns]    Discover the leaked /backup/dns-zone.txt from page source/robots and extract the TXT record flag.
TXT
chown student:student /home/student/README-LAB.txt
