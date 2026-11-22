#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_HEADER:-}" ] || FLAG_HEADER='FLAG{header}'
[ -n "${FLAG_IOC:-}" ] || FLAG_IOC='FLAG{ioc}'
mkdir -p /opt/triage
cat > /opt/triage/phish.eml <<EML
From: "Payroll Support" <alerts@payr0ll-update.invalid>
To: student@corp.invalid
Subject: Urgent: W-2 Verification Required
Return-Path: <bounce@198.51.100.44>
X-Campaign-ID: ${FLAG_HEADER}

Please review the attached invoice_2026.sh script immediately.
EML
HEX_IOC=$(printf '%s' "https://c2.dropper.invalid/checkin?id=${FLAG_IOC}" | xxd -p -c 256 2>/dev/null || python3 -c "print('https://c2.dropper.invalid/checkin?id=${FLAG_IOC}'.encode().hex())")
cat > /opt/triage/invoice_2026.sh <<SH
#!/usr/bin/env bash
# Simulated malicious attachment (benign analysis artifact)
ENC="${HEX_IOC}"
# Decoder hint: python3 -c "print(bytes.fromhex('\$ENC').decode())"
echo "Do not execute untrusted attachments."
SH
chmod 644 /opt/triage/*
cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m06-initial-access ===
Triage artifacts: /opt/triage/ (phish.eml, invoice_2026.sh)
Objectives (2 Flags):
1. [header] Analyze /opt/triage/phish.eml headers to extract X-Campaign-ID flag.
2. [ioc]    Deobfuscate the hex-encoded C2 URL in /opt/triage/invoice_2026.sh without executing it.
TXT
chown student:student /home/student/README-LAB.txt
