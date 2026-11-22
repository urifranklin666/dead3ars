#!/usr/bin/env bash
set -euo pipefail

IMG_DIR="/data/dead3ars-labs/images"
SRC="$IMG_DIR/debian12-cloud.qcow2"
WORK="$IMG_DIR/base-gui.qcow2.building"
OUT="$IMG_DIR/base-gui.qcow2"
TMP=$(mktemp -d /tmp/dead3ars-bake.XXXXXX)
trap 'rm -rf "$TMP"' EXIT

cp -f "$SRC" "$WORK"
qemu-img resize "$WORK" 10G

cat > "$TMP/meta-data" <<'EOF'
instance-id: dead3ars-base-bake
local-hostname: dead3ars-lab
EOF

cat > "$TMP/user-data" <<'EOF'
#cloud-config
hostname: dead3ars-lab
manage_etc_hosts: true
users:
  - name: student
    gecos: Dead3ars Student
    shell: /bin/bash
    lock_passwd: false
    plain_text_passwd: dead3ars
chpasswd:
  expire: false
package_update: true
packages:
  - xorg
  - xfce4-session
  - xfce4-panel
  - xfce4-terminal
  - xfwm4
  - xfdesktop4
  - xfce4-settings
  - dbus-x11
  - lightdm
  - lightdm-gtk-greeter
  - firefox-esr
  - curl
  - wget
  - jq
  - sqlite3
  - python3
  - python3-pip
  - nodejs
  - netcat-openbsd
  - nmap
  - tcpdump
  - strace
  - vim
  - nano
  - tmux
  - git
  - x11-xserver-utils
  - sudo
  - iproute2
  - procps
  - psmisc
  - cron
runcmd:
  # LightDM autologin as student
  - mkdir -p /etc/lightdm/lightdm.conf.d
  - |
    cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf <<'LDM'
    [Seat:*]
    autologin-user=student
    autologin-user-timeout=0
    user-session=xfce
    LDM
  # Serial console ttyS0 autologin as student
  - mkdir -p /etc/systemd/system/serial-getty@ttyS0.service.d
  - |
    cat > /etc/systemd/system/serial-getty@ttyS0.service.d/autologin.conf <<'SER'
    [Service]
    ExecStart=
    ExecStart=-/sbin/agetty -o '-p -f -- \\u' --keep-baud 115200,57600,38400,9600 --autologin student %I $TERM
    SER
  # Default desktop autostart: set 1280x800 and open terminal
  - mkdir -p /home/student/.config/autostart
  - |
    cat > /home/student/.config/autostart/lab-terminal.desktop <<'DESK'
    [Desktop Entry]
    Type=Application
    Name=Lab Terminal
    Exec=sh -c "sleep 2; xrandr --output Virtual-1 --mode 1280x800 2>/dev/null || true; xfce4-terminal --maximize"
    OnlyShowIn=XFCE;
    DESK
  - chown -R student:student /home/student
  - systemctl set-default graphical.target
  - systemctl enable lightdm
  - apt-get clean
  - rm -rf /var/lib/apt/lists/*
  # Prepare for clean per-student cloud-init on every CoW clone
  - cloud-init clean --logs
  - truncate -s 0 /etc/machine-id
  - sync
  - poweroff
EOF

xorriso -as mkisofs -o "$TMP/seed.iso" -V cidata -J -R "$TMP/user-data" "$TMP/meta-data" >/dev/null 2>&1

echo "Booting QEMU to bake base-gui.qcow2..."
timeout 900 qemu-system-x86_64 \
  -enable-kvm \
  -cpu host \
  -smp 4 \
  -m 2048 \
  -drive file="$WORK",format=qcow2,if=virtio \
  -cdrom "$TMP/seed.iso" \
  -netdev user,id=net0 \
  -device virtio-net-pci,netdev=net0 \
  -display none \
  -serial file:/tmp/bake-console.log

mv -f "$WORK" "$OUT"
chown dead3ars-lab:kvm "$OUT"
chmod 644 "$OUT"
ls -lh "$OUT"
echo "BASE_GUI_IMAGE_READY"
