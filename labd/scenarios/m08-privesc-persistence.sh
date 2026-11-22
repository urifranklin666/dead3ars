#!/usr/bin/env bash
set -euo pipefail
FLAG_USER="${FLAG_USER:-FLAG{user-default}}"
FLAG_ROOT="${FLAG_ROOT:-FLAG{root-default}}"
FLAG_HUNT="${FLAG_HUNT:-FLAG{hunt-default}}"

echo "$FLAG_USER" > /home/student/user.flag
chown student:student /home/student/user.flag
chmod 600 /home/student/user.flag

echo "$FLAG_ROOT" > /root/root.flag
chmod 600 /root/root.flag

# Deliberate privesc vector: writable backup helper executed by root via sudo NOPASSWD
mkdir -p /opt/ops
cat > /opt/ops/healthcheck.sh <<'SH'
#!/usr/bin/env bash
echo "System health OK: $(date)"
SH
chmod 777 /opt/ops/healthcheck.sh
echo "student ALL=(root) NOPASSWD: /opt/ops/healthcheck.sh" > /etc/sudoers.d/dead3ars-lab
chmod 440 /etc/sudoers.d/dead3ars-lab

# Deliberate persistence artifact for the defender hunt step
cat > /etc/cron.d/sys-telemetry-sync <<CRON
# Legacy telemetry beacon (simulated persistence artifact)
# HUNT_FLAG=${FLAG_HUNT}
*/15 * * * * root /bin/true
CRON
chmod 644 /etc/cron.d/sys-telemetry-sync

cat > /home/student/README-LAB.txt <<'TXT'
=== DEAD3ARS LAB: m08-privesc-persistence ===
You are logged in as: student

Objectives (3 Flags):
1. [user] Confirm your foothold by reading /home/student/user.flag.
2. [root] Enumerate sudo permissions & writable root-executed scripts (try: sudo -l),
          escalate to root, and read /root/root.flag.
3. [hunt] Switch to defender mode: enumerate scheduled tasks (/etc/cron.d/) to find the
          simulated persistence artifact and extract HUNT_FLAG.
TXT
chown student:student /home/student/README-LAB.txt
