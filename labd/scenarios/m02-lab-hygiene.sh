#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_ISO:-}" ] || FLAG_ISO='FLAG{iso}'
[ -n "${FLAG_PERM:-}" ] || FLAG_PERM='FLAG{perm}'
mkdir -p /opt/lab-check
cat > /opt/lab-check/verify-hygiene.sh <<SH
#!/usr/bin/env bash
# Verifies isolation (no non-loopback NIC) and secret permissions
if ip -br link | grep -vq '^lo '; then
  echo "FAIL: external network interface detected"
  exit 1
fi
echo "ISOLATION_OK: ${FLAG_ISO}"
PERM=\$(stat -c '%a' /home/student/.secrets.env 2>/dev/null || echo "000")
if [ "\$PERM" = "600" ]; then
  echo "PERMISSIONS_OK: ${FLAG_PERM}"
else
  echo "HINT: /home/student/.secrets.env is mode \$PERM (should be 600)"
fi
SH
chmod 755 /opt/lab-check/verify-hygiene.sh
echo "API_KEY=demo_key_rotate_me" > /home/student/.secrets.env
chown student:student /home/student/.secrets.env
chmod 666 /home/student/.secrets.env
cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m02-lab-hygiene ===
Objectives (2 Flags):
1. [iso]  Run /opt/lab-check/verify-hygiene.sh to confirm host-only isolation and get ISOLATION_OK flag.
2. [perm] Fix world-readable permissions on /home/student/.secrets.env (chmod 600) and re-run verify-hygiene.sh.
TXT
chown student:student /home/student/README-LAB.txt
