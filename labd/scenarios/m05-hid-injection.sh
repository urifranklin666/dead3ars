#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_DECODE:-}" ] || FLAG_DECODE='FLAG{decode}'
[ -n "${FLAG_USB:-}" ] || FLAG_USB='FLAG{usb}'
mkdir -p /opt/hid-samples
B64=$(printf '%s' "echo stage2-beacon && echo ${FLAG_DECODE}" | base64 -w0)
cat > /opt/hid-samples/payload.dd <<DD
REM Simulated BadUSB / HID Injection Script (DO NOT RUN ON PROD)
DELAY 1500
GUI r
DELAY 400
STRING powershell -NoP -W Hidden -Enc ${B64}
ENTER
DD
cat > /opt/hid-samples/usb-audit.log <<LOG
kernel: usb 1-2: New USB device found, idVendor=16c0, idProduct=0486, bcdDevice=2.77
kernel: usb 1-2: Product: Teensyduino Keyboard/Mouse/Joystick
kernel: usb 1-2: SerialNumber: ${FLAG_USB}
LOG
cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m05-hid-injection ===
Samples directory: /opt/hid-samples/
Objectives (2 Flags):
1. [decode] Decode the base64 payload in /opt/hid-samples/payload.dd to recover the stage-2 flag.
2. [usb]    Inspect /opt/hid-samples/usb-audit.log to extract the rogue HID device SerialNumber flag.
TXT
chown student:student /home/student/README-LAB.txt
