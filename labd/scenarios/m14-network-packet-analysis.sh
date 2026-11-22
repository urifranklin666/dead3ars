#!/usr/bin/env bash
set -euo pipefail
mkdir -p /var/captures

cat > /tmp/write_pcap.py <<'PYEOF'
import struct, socket, time, os

SRC = "10.0.0.50"
DST = "10.0.0.1"
FLAG_CREDS = os.environ.get("FLAG_CREDS", "FLAG{creds-default}")
FLAG_HTTP_EXFIL = os.environ.get("FLAG_HTTP_EXFIL", "FLAG{http_exfil-default}")
FLAG_DNS_TUNNEL = os.environ.get("FLAG_DNS_TUNNEL", "FLAG{dns_tunnel-default}")

def ip_checksum(hdr):
    s = 0
    for i in range(0, len(hdr), 2):
        w = (hdr[i] << 8) + (hdr[i + 1] if i + 1 < len(hdr) else 0)
        s += w
    while s >> 16:
        s = (s & 0xFFFF) + (s >> 16)
    return (~s) & 0xFFFF

def ip_hdr(src, dst, proto, payload_len):
    hdr = struct.pack("!BBHHHBBH4s4s", 0x45, 0, 20 + payload_len, 0x1234, 0x4000, 64, proto, 0,
                      socket.inet_aton(src), socket.inet_aton(dst))
    cs = ip_checksum(hdr)
    return struct.pack("!BBHHHBBH4s4s", 0x45, 0, 20 + payload_len, 0x1234, 0x4000, 64, proto, cs,
                       socket.inet_aton(src), socket.inet_aton(dst))

def eth_ipv4(payload):
    src_mac = b"\x52\x54\x00\x11\x22\x33"
    dst_mac = b"\x52\x54\x00\x44\x55\x66"
    return dst_mac + src_mac + struct.pack("!H", 0x0800) + payload

def pcap_pkt(ts_sec, ts_usec, data):
    return struct.pack("<IIII", ts_sec, ts_usec, len(data), len(data)) + data

with open("/var/captures/incident.pcap", "wb") as f:
    # PCAP global header: magic, major=2, minor=4, thiszone=0, sigfigs=0, snaplen=65535, network=1 (Ethernet)
    f.write(struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1))
    base_ts = int(time.time()) - 3600

    # Packet 1: FTP cleartext login
    p1_data = f"USER student\r\nPASS {FLAG_CREDS}\r\n".encode()
    tcp1 = struct.pack("!HHIIHHHH", 50000, 21, 1, 1, 0x5018, 65535, 0, 0)
    pkt1 = eth_ipv4(ip_hdr(SRC, DST, socket.IPPROTO_TCP, len(tcp1) + len(p1_data)) + tcp1 + p1_data)
    f.write(pcap_pkt(base_ts, 0, pkt1))

    # Packet 2: HTTP POST exfiltration
    http_body = f'{{"exfil": "{FLAG_HTTP_EXFIL}", "host": "10.0.0.50"}}'.encode()
    p2_data = (
        b"POST /upload HTTP/1.1\r\n"
        b"Host: 10.0.0.1\r\n"
        b"Content-Type: application/json\r\n"
        + f"Content-Length: {len(http_body)}\r\n\r\n".encode()
    ) + http_body
    tcp2 = struct.pack("!HHIIHHHH", 50001, 80, 100, 1, 0x5018, 65535, 0, 0)
    pkt2 = eth_ipv4(ip_hdr(SRC, DST, socket.IPPROTO_TCP, len(tcp2) + len(p2_data)) + tcp2 + p2_data)
    f.write(pcap_pkt(base_ts + 1, 500000, pkt2))

    # Packet 3: DNS query with tunnel label
    dns_hdr = struct.pack("!HHHHHH", 0xABCD, 0x0100, 1, 0, 0, 0)
    raw_label = FLAG_DNS_TUNNEL.encode()[:63]
    qname = bytes([len(raw_label)]) + raw_label + b"\x05exfil\x07invalid\x00"
    dns_payload = dns_hdr + qname + struct.pack("!HH", 1, 1)
    udp3 = struct.pack("!HHHH", 53123, 53, 8 + len(dns_payload), 0)
    pkt3 = eth_ipv4(ip_hdr(SRC, DST, socket.IPPROTO_UDP, len(udp3) + len(dns_payload)) + udp3 + dns_payload)
    f.write(pcap_pkt(base_ts + 2, 0, pkt3))

print("PCAP written cleanly")
PYEOF

python3 /tmp/write_pcap.py
rm -f /tmp/write_pcap.py
chmod 644 /var/captures/incident.pcap
ln -sf /usr/sbin/tcpdump /usr/local/bin/tcpdump

cat > /home/student/README-LAB.txt <<'TXT'
=== DEAD3ARS LAB: m14-network-packet-analysis ===
PCAP file: /var/captures/incident.pcap

Objectives (3 Flags):
1. [creds]      Filter cleartext auth on TCP/21: tcpdump -A -nn -r /var/captures/incident.pcap port 21
2. [http_exfil] Inspect HTTP POST traffic on TCP/80: tcpdump -A -nn -r /var/captures/incident.pcap port 80
3. [dns_tunnel] Filter DNS queries on UDP/53: tcpdump -nn -r /var/captures/incident.pcap port 53
TXT
chown student:student /home/student/README-LAB.txt
